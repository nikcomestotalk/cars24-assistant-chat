import { createFileRoute } from "@tanstack/react-router";
import { FlowsPage } from "../components/flows/FlowsPage";

export const Route = createFileRoute("/flows")({
  component: FlowsPage,
});
