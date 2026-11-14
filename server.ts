import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const VALID_THEMES = new Set(['generic', 'aws', 'gcp', 'azure', 'kubernetes']);
const VALID_GROUP_COLORS = new Set(['blue', 'purple', 'emerald', 'amber', 'slate']);
const VALID_CATEGORIES = new Set([
  'client',
  'network',
  'compute',
  'database',
  'cache',
  'queue',
  'storage',
  'ai',
  'security',
]);
const VALID_EDGE_TYPES = new Set(['sync', 'async', 'data']);

const architectureSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Concise title for the system architecture diagram.',
    },
    theme: {
      type: Type.STRING,
      enum: ['generic', 'aws', 'gcp', 'azure', 'kubernetes'],
      description: 'Cloud or infrastructure theme for the diagram.',
    },
    summary: {
      type: Type.STRING,
      description: 'Brief 1-sentence explanation of what was built or updated.',
    },
    groups: {
      type: Type.ARRAY,
      description: 'Logical architectural boundary groups (e.g., Edge Layer, Core Services, Data Tier).',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          color: {
            type: Type.STRING,
            enum: ['blue', 'purple', 'emerald', 'amber', 'slate'],
          },
        },
        required: ['id', 'label', 'color'],
      },
    },
    nodes: {
      type: Type.ARRAY,
      description: 'Components, services, clients, queues, caches, and databases in the architecture.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          groupId: {
            type: Type.STRING,
            description: 'Optional ID of the group this node belongs to.',
          },
          label: { type: Type.STRING },
          tech: {
            type: Type.STRING,
            description: 'Specific technology or service name (e.g., CloudFront, FastAPI, Kafka, PostgreSQL).',
          },
          category: {
            type: Type.STRING,
            enum: ['client', 'network', 'compute', 'database', 'cache', 'queue', 'storage', 'ai', 'security'],
          },
          description: {
            type: Type.STRING,
            description: 'Concise technical responsibility of this component.',
          },
          tier: {
            type: Type.INTEGER,
            description:
              'Horizontal column index: 0 = clients/users, 1 = edge/CDN/gateway/WAF, 2 = compute/API/services, 3 = messaging/queues/cache/orchestration, 4 = databases/object storage/analytics.',
          },
        },
        required: ['id', 'label', 'tech', 'category', 'description', 'tier'],
      },
    },
    edges: {
      type: Type.ARRAY,
      description: 'Directed connections representing requests, events, or data flows between nodes.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          source: { type: Type.STRING },
          target: { type: Type.STRING },
          label: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ['sync', 'async', 'data'],
          },
        },
        required: ['id', 'source', 'target', 'label', 'type'],
      },
    },
  },
  required: ['title', 'theme', 'summary', 'groups', 'nodes', 'edges'],
};

function sanitizeDiagram(raw: any, requestedTheme?: string) {
  const theme = VALID_THEMES.has(raw?.theme)
    ? raw.theme
    : VALID_THEMES.has(requestedTheme ?? '')
      ? requestedTheme
      : 'generic';

  const groups = Array.isArray(raw?.groups)
    ? raw.groups
        .filter((g: any) => g && g.id && g.label)
        .map((g: any) => ({
          id: String(g.id).trim(),
          label: String(g.label).trim(),
          color: VALID_GROUP_COLORS.has(g.color) ? g.color : 'slate',
        }))
    : [];

  const groupIds = new Set(groups.map((g: any) => g.id));

  const nodes = Array.isArray(raw?.nodes)
    ? raw.nodes
        .filter((n: any) => n && n.id && n.label)
        .map((n: any) => {
          const parsedTier = Number(n.tier);
          const tier = Number.isFinite(parsedTier) ? Math.max(0, Math.min(6, Math.round(parsedTier))) : 2;
          const groupId = n.groupId && groupIds.has(String(n.groupId).trim()) ? String(n.groupId).trim() : undefined;
          return {
            id: String(n.id).trim(),
            ...(groupId ? { groupId } : {}),
            label: String(n.label).trim(),
            tech: String(n.tech || 'Service').trim(),
            category: VALID_CATEGORIES.has(n.category) ? n.category : 'compute',
            description: String(n.description || '').trim(),
            tier,
          };
        })
    : [];

  const nodeIds = new Set(nodes.map((n: any) => n.id));

  const edges = Array.isArray(raw?.edges)
    ? raw.edges
        .filter(
          (e: any) =>
            e &&
            e.source &&
            e.target &&
            nodeIds.has(String(e.source).trim()) &&
            nodeIds.has(String(e.target).trim()) &&
            String(e.source).trim() !== String(e.target).trim()
        )
        .map((e: any, index: number) => ({
          id: String(e.id || `edge-${index + 1}`).trim(),
          source: String(e.source).trim(),
          target: String(e.target).trim(),
          label: String(e.label || '').trim(),
          type: VALID_EDGE_TYPES.has(e.type) ? e.type : 'sync',
        }))
    : [];

  return {
    title: String(raw?.title || 'System Architecture').trim(),
    theme,
    summary: String(raw?.summary || 'Generated system architecture diagram.').trim(),
    groups,
    nodes,
    edges,
  };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.post('/api/architecture/generate', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { prompt, currentDiagram, theme } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please provide an architecture prompt.' });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are a Principal Cloud & Systems Architect.
Generate or iteratively modify clean, realistic, production-grade system architecture diagrams in strict JSON format.

Design rules:
1. Tiers represent horizontal flow columns from left to right:
   - tier 0: End-user clients, browsers, mobile apps, IoT devices, external webhooks/partners
   - tier 1: Edge, DNS, CDN, WAF, Load Balancers, API Gateways, Ingress
   - tier 2: Core compute, microservices, serverless functions, BFFs, AI/ML inference & agents
   - tier 3: Asynchronous messaging, event buses, Kafka/SQS/PubSub, Redis/caches, workflow orchestrators, vector indices
   - tier 4: Primary databases, read replicas, data warehouses, object storage, observability/audit stores
2. Group related components logically into 2-5 groups (e.g., "Client & Edge", "Application VPC", "Messaging & Cache", "Persistence Tier"). Every node in a tier that belongs to a group should share a coherent groupId.
3. Keep node IDs stable, concise kebab-case slugs (e.g., "api-gateway", "orders-service", "postgres-primary").
4. Keep labels concise (2-4 words) and specify concrete technologies in "tech" aligned with the requested cloud/platform theme (${theme || 'generic'}).
5. When modifying an existing diagram:
   - Preserve existing node IDs, group IDs, and edge IDs for unchanged components so the user's canvas layout remains stable.
   - Add, update, or remove only the components and connections requested by the user.
   - Provide a clear 1-sentence "summary" describing what was built or updated.`;

      const userContent = currentDiagram
        ? `Current Architecture Diagram JSON:\n${JSON.stringify(currentDiagram, null, 2)}\n\nRequested Update:\n${prompt.trim()}\n\nPreferred theme: ${theme || currentDiagram.theme || 'generic'}.`
        : `Design a complete system architecture diagram for:\n${prompt.trim()}\n\nPreferred theme: ${theme || 'generic'}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userContent,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: architectureSchema,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        return res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
      }

      const parsed = JSON.parse(rawText);
      const sanitized = sanitizeDiagram(parsed, theme);

      if (sanitized.nodes.length === 0) {
        return res.status(502).json({ error: 'Generated diagram contained no nodes. Please refine your prompt.' });
      }

      return res.json({ diagram: sanitized });
    } catch (err: any) {
      console.error('Gemini architecture generation failed:', err);
      const status = typeof err?.status === 'number' ? err.status : 500;
      const message =
        err?.message?.includes('API_KEY_INVALID') || status === 400 || status === 403
          ? 'Invalid or unauthorized Gemini API key. Check your key in Settings > Secrets.'
          : err?.message || 'Failed to generate architecture diagram.';
      return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ArchForge Studio server running at http://0.0.0.0:${PORT}`);
  });
}

createServer();
