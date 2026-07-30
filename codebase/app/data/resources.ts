import type { Resource } from "../types/resource";
import { discordResources } from "./discord-resources";

// All resources from Discord (139 real documents)
export const resources: Resource[] = discordResources;

export const resourceById = new Map(resources.map((resource) => [resource.id, resource]));

export function getResources(): Resource[] {
  return resources;
}
