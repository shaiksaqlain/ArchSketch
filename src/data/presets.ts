import { ArchitectureDiagram } from '../types/architecture';

export const DEFAULT_DIAGRAM: ArchitectureDiagram = {
  title: 'Cloud-Native Order & Payment Platform',
  theme: 'aws',
  summary:
    'Event-driven e-commerce architecture with edge protection, microservices, Kafka event bus, and polyglot persistence.',
  groups: [
    { id: 'edge-layer', label: 'Edge & Ingress', color: 'blue' },
    { id: 'core-services', label: 'Application VPC', color: 'purple' },
    { id: 'async-cache', label: 'Messaging & Cache', color: 'amber' },
    { id: 'data-tier', label: 'Persistence Tier', color: 'emerald' },
  ],
  nodes: [
    {
      id: 'web-client',
      label: 'Web & Mobile Clients',
      tech: 'Next.js / iOS',
      category: 'client',
      description: 'Customer storefront and mobile checkout applications.',
      tier: 0,
    },
    {
      id: 'cdn-waf',
      groupId: 'edge-layer',
      label: 'CDN & Edge WAF',
      tech: 'CloudFront + WAF',
      category: 'security',
      description: 'DDoS mitigation, TLS termination, and edge static caching.',
      tier: 1,
    },
    {
      id: 'api-gateway',
      groupId: 'edge-layer',
      label: 'API Gateway',
      tech: 'Envoy / REST & gRPC',
      category: 'network',
      description: 'JWT verification, rate limiting, and service routing.',
      tier: 1,
    },
    {
      id: 'order-service',
      groupId: 'core-services',
      label: 'Order Service',
      tech: 'Go / Kubernetes',
      category: 'compute',
      description: 'Manages cart checkout, order state machine, and sagas.',
      tier: 2,
    },
    {
      id: 'payment-service',
      groupId: 'core-services',
      label: 'Payment Service',
      tech: 'Node.js / Stripe API',
      category: 'compute',
      description: 'Idempotent payment intents, refunds, and ledger events.',
      tier: 2,
    },
    {
      id: 'fraud-ai',
      groupId: 'core-services',
      label: 'Fraud Scoring Model',
      tech: 'Python / SageMaker',
      category: 'ai',
      description: 'Real-time transaction risk inference before capture.',
      tier: 2,
    },
    {
      id: 'redis-cache',
      groupId: 'async-cache',
      label: 'Session & Cart Cache',
      tech: 'Redis Cluster',
      category: 'cache',
      description: 'Sub-millisecond cart state, idempotency keys, and rate counters.',
      tier: 3,
    },
    {
      id: 'kafka-bus',
      groupId: 'async-cache',
      label: 'Order Event Bus',
      tech: 'Apache Kafka',
      category: 'queue',
      description: 'Durable event streaming for OrderPlaced and PaymentSettled.',
      tier: 3,
    },
    {
      id: 'postgres-orders',
      groupId: 'data-tier',
      label: 'Orders Database',
      tech: 'PostgreSQL Primary',
      category: 'database',
      description: 'ACID transactional store for orders, line items, and ledger.',
      tier: 4,
    },
    {
      id: 's3-analytics',
      groupId: 'data-tier',
      label: 'Audit & Data Lake',
      tech: 'Amazon S3 + Parquet',
      category: 'storage',
      description: 'Immutable transaction archives and downstream BI warehouse feed.',
      tier: 4,
    },
  ],
  edges: [
    { id: 'e1', source: 'web-client', target: 'cdn-waf', label: 'HTTPS / TLS 1.3', type: 'sync' },
    { id: 'e2', source: 'cdn-waf', target: 'api-gateway', label: 'Filtered Traffic', type: 'sync' },
    { id: 'e3', source: 'api-gateway', target: 'order-service', label: 'gRPC / Orders', type: 'sync' },
    { id: 'e4', source: 'api-gateway', target: 'payment-service', label: 'REST / Checkout', type: 'sync' },
    { id: 'e5', source: 'order-service', target: 'redis-cache', label: 'Cart & Locks', type: 'sync' },
    { id: 'e6', source: 'payment-service', target: 'fraud-ai', label: 'Risk Score', type: 'sync' },
    { id: 'e7', source: 'order-service', target: 'kafka-bus', label: 'OrderCreated', type: 'async' },
    { id: 'e8', source: 'payment-service', target: 'kafka-bus', label: 'PaymentCaptured', type: 'async' },
    { id: 'e9', source: 'order-service', target: 'postgres-orders', label: 'SQL Transactions', type: 'data' },
    { id: 'e10', source: 'kafka-bus', target: 's3-analytics', label: 'CDC Stream', type: 'data' },
  ],
};

export interface ArchitecturePreset {
  id: string;
  label: string;
  theme: ArchitectureDiagram['theme'];
  prompt: string;
}

export const QUICK_PROMPTS: ArchitecturePreset[] = [
  {
    id: 'rag-ai',
    label: 'Enterprise RAG AI Pipeline',
    theme: 'gcp',
    prompt:
      'Design a production RAG AI assistant on GCP with Cloud CDN, API Gateway, Document Ingestion Worker, Embedding Pipeline, Vector Search database, LLM Orchestrator service, Redis semantic cache, and Cloud Storage.',
  },
  {
    id: 'realtime-collab',
    label: 'Real-Time Multiplayer SaaS',
    theme: 'generic',
    prompt:
      'Create a real-time collaborative workspace architecture with Web/Desktop clients, Edge Load Balancer, WebSocket Gateway cluster, CRDT Sync Engine, Redis Pub/Sub, Kafka event log, PostgreSQL, and S3 snapshot storage.',
  },
  {
    id: 'iot-telemetry',
    label: 'IoT Telemetry & Streaming',
    theme: 'azure',
    prompt:
      'Build an IoT fleet telemetry platform on Azure with Edge Devices, IoT Hub Ingress, Stream Analytics, Anomaly Detection AI worker, Event Hubs queue, Timescale/Cosmos time-series DB, and Blob Storage archive.',
  },
  {
    id: 'k8s-fintech',
    label: 'Zero-Trust K8s FinTech',
    theme: 'kubernetes',
    prompt:
      'Architect a zero-trust Kubernetes FinTech core with Mobile App, Cloudflare WAF, Istio Ingress Gateway, Auth/OIDC Service, Ledger Core, Fraud Engine, RabbitMQ, CockroachDB cluster, and Vault secrets.',
  },
];
