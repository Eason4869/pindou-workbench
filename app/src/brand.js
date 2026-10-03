import project from "../package.json" with { type: "json" };

export const BRAND = Object.freeze({
  name: project.heybox.name,
  version: project.version,
  author: project.author,
  repository: project.homepage,
});
