import { RequestContext } from "../shared/types";

export type Middleware = (ctx: RequestContext<unknown>, next: () => Promise<unknown>) => Promise<unknown>;

export function chain(defHandler: (ctx: RequestContext<unknown>) => Promise<unknown>, mws: Middleware[]) {
	return (ctx: RequestContext<unknown>) => {
		let i = -1;
		const run = async (idx: number): Promise<unknown> => {
			if (idx === i) throw "mw_next_called_twice";
			i = idx;
			const mw = mws[idx];
			if (!mw) return defHandler(ctx);
			return mw(ctx, () => run(idx + 1));
		};
		return run(0);
	};
}


