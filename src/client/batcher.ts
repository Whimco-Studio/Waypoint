import { RunService } from "@rbxts/services";

export type Pending = { id: number; fqn: string; payload: unknown; resolve: (v: unknown) => void; reject: (e: unknown) => void };

export class Batcher {
	private queue = new Array<Pending>();
	private nextId = 1;
	private flushing = false;

	constructor(private send: (batch: { id: number; fqn: string; payload: unknown }[]) => void) {}

	enqueue(fqn: string, payload: unknown) {
		return new Promise<unknown>((resolve, reject) => {
			this.queue.push({ id: this.nextId++, fqn, payload, resolve, reject });
			if (!this.flushing) this.flushSoon();
		});
	}

	onResponses(resps: { id: number; ok: boolean; data?: unknown; err?: string }[]) {
		const byId: Record<number, Pending> = {} as never;
		for (const p of this.queue) byId[p.id] = p;
		for (const r of resps) {
			const p = byId[r.id];
			if (!p) continue;
			r.ok ? p.resolve(r.data) : p.reject(r.err);
			(byId as Record<number, Pending | undefined>)[r.id] = undefined;
		}
		this.queue = this.queue.filter(p => byId[p.id] !== undefined); // keep unresolved (if any)
	}

	private flushSoon() {
		this.flushing = true;
		task.spawn(() => {
			RunService.Heartbeat.Wait();
			this.flush();
		});
	}

	private flush() {
		const batch = this.queue.map(({ id, fqn, payload }) => ({ id, fqn, payload }));
		this.queue.clear();
		this.send(batch);
		this.flushing = false;
	}
}


