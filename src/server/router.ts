import { t } from "@rbxts/t";
import { NamespaceTree, RouteDef, RouteTable, RequestContext } from "../shared/types";

export class Router {
	private tree: NamespaceTree;
	constructor(rootName = "root") {
		this.tree = { name: rootName, routes: {}, children: [] };
	}

	ns(name: string, builder: (r: Router) => void) {
		const child = new Router(name);
		builder(child);
		(this.tree.children as NamespaceTree[]).push(child.tree);
		return this;
	}

	route<In, Out>(name: string, def: RouteDef<In, Out>) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this.tree.routes as RouteTable)[name] = def as any;
		return this;
	}

	getTree() { return this.tree; }

	// internal: resolve and run a route
	async dispatch(fqn: string, player: Player, payload: unknown) {
		const [node, key] = this.resolve(fqn);
		const def = node.routes[key];
		if (!def) throw `route_not_found:${fqn}`;
		if (!def.in(payload)) throw `bad_request:${fqn}`;
		const ctx: RequestContext<unknown> = { player, params: payload, route: fqn, time: os.clock() };
		const result = await Promise.resolve(def.handler(ctx));
		if (!def.out(result)) throw `bad_response:${fqn}`;
		return result;
	}

	private resolve(fqn: string): [NamespaceTree, string] {
		const parts = string.split(fqn, ".");
		let node = this.tree;
		for (let i = 0; i < parts.size() - 1; i++) {
			const name = parts[i];
			let matchedChild: NamespaceTree | undefined = undefined;
			for (const c of node.children ?? []) if (c.name === name) { matchedChild = c; break; }
			if (!matchedChild) {
				let prefix = parts[0];
				for (let j = 1; j <= i; j++) prefix = `${prefix}.${parts[j]}`;
				throw `ns_not_found:${prefix}`;
			}
			node = matchedChild;
		}
		return [node, parts[parts.size() - 1]];
	}
}


