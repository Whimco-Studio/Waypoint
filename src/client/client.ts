import { ReplicatedStorage } from "@rbxts/services";
import { Batcher } from "./batcher";
import { Manifest } from "../shared/types";

const REMOTE_FOLDER = "Chisel";
const EVT_REQ = "BatchReq";
const EVT_RES = "BatchRes";
const EVT_MANIFEST = "Manifest";

export class Client {
    private req!: RemoteEvent;
    private res!: RemoteEvent;
    private manifestEvt!: RemoteEvent;
    private batcher!: Batcher;
    private manifest: Manifest | undefined;

    async init() {
        const folder = ReplicatedStorage.WaitForChild(REMOTE_FOLDER) as Folder;
        this.req = folder.WaitForChild(EVT_REQ) as RemoteEvent;
        this.res = folder.WaitForChild(EVT_RES) as RemoteEvent;
        this.manifestEvt = folder.WaitForChild(EVT_MANIFEST) as RemoteEvent;

        this.batcher = new Batcher((batch) => this.req.FireServer(batch));
        this.res.OnClientEvent.Connect((responses) => this.batcher.onResponses(responses));
        // capture manifest (best effort; if we missed, calls still work by fqn)
        this.manifestEvt.OnClientEvent.Connect((m: Manifest) => (this.manifest = m));
    }

    call<Out>(fqn: string, payload: unknown): Promise<Out> {
        return this.batcher.enqueue(fqn, payload) as Promise<Out>;
    }

    // optional sugar: create a tiny namespace proxy from the manifest
    ns(namespace: string) {
        const prefix = namespace + ".";
        return {
            call: <T>(name: string, payload: unknown) => this.call<T>(prefix + name, payload),
        };
    }
}


