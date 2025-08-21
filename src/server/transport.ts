import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import { buildManifest } from "../shared/manifest";
import { Router } from "./router";
import { Middleware, chain } from "./middleware";

type BatchRequest = { id: number; fqn: string; payload: unknown };
type BatchResponse = { id: number; ok: boolean; data?: unknown; err?: string };

const REMOTE_FOLDER = "Chisel";
const EVT_REQ = "BatchReq";
const EVT_RES = "BatchRes";
const EVT_MANIFEST = "Manifest";

export class Transport {
	private req!: RemoteEvent;
	private res!: RemoteEvent;
	private manifestEvt!: RemoteEvent;

	constructor(private router: Router, private middlewares: Middleware[] = []) {}

	start() {
		const folder = this.ensureFolder();
		this.req = this.ensureEvent(folder, EVT_REQ);
		this.res = this.ensureEvent(folder, EVT_RES);
		this.manifestEvt = this.ensureEvent(folder, EVT_MANIFEST);

		// send manifest on player join
		const manifest = buildManifest(this.router.getTree());
		Players.PlayerAdded.Connect((plr: Player) => this.manifestEvt.FireClient(plr, manifest));

		// handle batch requests
		this.req.OnServerEvent.Connect((plr: Player, batch: unknown) => {
			const typed = batch as BatchRequest[];
			const responses: BatchResponse[] = [];
			for (const { id, fqn, payload } of typed) {
				const ctxBase = { player: plr, params: payload, route: fqn, time: os.clock() };
				const run = async () => this.router.dispatch(fqn, plr, payload);
				chain(async () => run(), this.middlewares)(ctxBase)
					.then((data) => responses.push({ id, ok: true, data }))
					.catch((e) => responses.push({ id, ok: false, err: tostring(e) }));
			}
			// flush next heartbeat to coalesce bursts
			task.spawn(() => {
				RunService.Heartbeat.Wait();
				this.res.FireClient(plr, responses);
			});
		});
	}

	private ensureFolder() {
		const root = (ReplicatedStorage.FindFirstChild(REMOTE_FOLDER) as Folder) ?? new Instance("Folder");
		root.Name = REMOTE_FOLDER;
		root.Parent = ReplicatedStorage;
		return root;
	}
	private ensureEvent(parent: Instance, name: string) {
		const evt = (parent.FindFirstChild(name) as RemoteEvent) ?? new Instance("RemoteEvent");
		evt.Name = name;
		evt.Parent = parent;
		return evt;
	}
}


