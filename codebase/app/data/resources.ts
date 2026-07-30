import type { Resource } from "../types/resource";
import { classifiedResources } from "./classified-resources.generated";

// Toàn bộ tài liệu đã được phân loại từ Discord (77 mục)
export const resources: Resource[] = classifiedResources;

export const resourceById = new Map(resources.map((resource) => [resource.id, resource]));

export function getResources(): Resource[] {
  return resources;
}
