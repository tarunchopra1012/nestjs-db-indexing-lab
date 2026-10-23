import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { TypeormInstrumentation } from 'opentelemetry-instrumentation-typeorm';

export const otelSDK = new NodeSDK({
  serviceName: 'orders-indexing-lab',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces', // Sends traces to local Jaeger container
  }),
  instrumentations: [
    getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } }),
    new PgInstrumentation({ enhancedDatabaseReporting: true }), // Captures exact SQL text
    new TypeormInstrumentation(),
  ],
});

otelSDK.start();