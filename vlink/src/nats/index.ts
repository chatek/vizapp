/**
 * Public surface of the VLink NATS layer.
 *
 * `VLinkRuntime` composes these three pieces; tests substitute fake transports
 * and Matter adapters through the interfaces in `src/types.ts`.
 */

export { CommandRouter, type CommandRouterOptions } from "./command-router.ts";
export { TelemetryPublisher, type TelemetryPublisherOptions } from "./publisher.ts";
export { NatsAuthError, NatsNotConnectedError, NodeNatsTransport } from "./transport.ts";
