import { NamespaceTree, Manifest } from "./types";

export function buildManifest(root: NamespaceTree): Manifest {
	const routes: Manifest["routes"] = [];
	function walk(node: NamespaceTree, prefix: string[]) {
		const base = [...prefix, node.name];
		for (const [key] of pairs(node.routes)) {
			routes.push({ fqn: [...base, key].join(".") });
		}
		for (const child of node.children ?? []) walk(child, base);
	}
	walk(root, []);
	return { namespaces: flattenNamespaces(root), routes, version: math.random(1, 1e9) };
}

function flattenNamespaces(root: NamespaceTree): string[] {
	const seen: Record<string, boolean> = {};
	const out = new Array<string>();
	function rec(n: NamespaceTree, p: string[]) {
		const cur = [...p, n.name];
		const name = cur.join(".");
		if (!seen[name]) {
			seen[name] = true;
			out.push(name);
		}
		for (const c of n.children ?? []) rec(c, cur);
	}
	rec(root, []);
	return out;
}


