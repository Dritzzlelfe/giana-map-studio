import type { TreeNode } from "./mapApi";

export function treeToJson(tree: TreeNode | null): string {
  if (!tree) return "{}";
  const strip = (n: TreeNode): unknown => ({
    title: n.title,
    description: n.description ?? undefined,
    category: n.category ?? undefined,
    status: n.status ?? undefined,
    priority: n.priority ?? undefined,
    children: n.children.length ? n.children.map(strip) : undefined,
  });
  return JSON.stringify(strip(tree), null, 2);
}

export function treeToMarkdown(tree: TreeNode | null): string {
  if (!tree) return "";
  const lines: string[] = [];
  const walk = (n: TreeNode, depth: number) => {
    const indent = "  ".repeat(depth);
    const asap = n.priority === "asap" ? " [asap]" : "";
    lines.push(`${indent}- ${n.title}${asap}`);
    for (const c of n.children) walk(c, depth + 1);
  };
  walk(tree, 0);
  return lines.join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
