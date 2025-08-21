import { t } from "@rbxts/t";

export type Checker<T> = (v: unknown) => v is T;
export type RouteDef<In, Out> = {
	in: Checker<In>;
	out: Checker<Out>;
	handler: (ctx: RequestContext<In>) => Out | Promise<Out>;
};

export type RequestContext<In> = {
	player: Player;
	params: In;
	route: string;        // fully qualified "ns.name"
	time: number;         // os.clock()
};

export type RouteTable = Record<string, RouteDef<any, any>>;

export type NamespaceTree = {
	name: string; // e.g. "eggs"
	routes: RouteTable;
	children?: NamespaceTree[];
};

export type ManifestRoute = {
	fqn: string; // "eggs.ping"
};

export type Manifest = {
	namespaces: string[];        // ["eggs", ...]
	routes: ManifestRoute[];     // [{ fqn: "eggs.ping" }, ...]
	version: number;             // bump on server start
};


