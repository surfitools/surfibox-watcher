import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { ServerValue, getDatabase } from "firebase-admin/database";
//#region src/lib/assets.ts
const ASSETS = [
	{
		id: "BTC",
		label: "Bitcoin",
		symbol: "BTC",
		network: "btc",
		networkLabel: "Bitcoin",
		gecko: "bitcoin",
		decimals: 8,
		color: "#f7931a",
		explorer: (t) => `https://mempool.space/tx/${t}`,
		uri: (a, n) => `bitcoin:${a}?amount=${n}`
	},
	{
		id: "ETH",
		label: "Ether",
		symbol: "ETH",
		network: "eth",
		networkLabel: "Ethereum",
		gecko: "ethereum",
		decimals: 6,
		color: "#627eea",
		explorer: (t) => `https://etherscan.io/tx/${t}`,
		uri: (a) => `ethereum:${a}`
	},
	{
		id: "USDT_ERC20",
		label: "Tether",
		symbol: "USDT",
		network: "eth",
		networkLabel: "Ethereum · ERC-20",
		decimals: 2,
		color: "#26a17b",
		explorer: (t) => `https://etherscan.io/tx/${t}`,
		uri: (a) => a
	},
	{
		id: "USDC_ERC20",
		label: "USD Coin",
		symbol: "USDC",
		network: "eth",
		networkLabel: "Ethereum · ERC-20",
		decimals: 2,
		color: "#2775ca",
		explorer: (t) => `https://etherscan.io/tx/${t}`,
		uri: (a) => a
	},
	{
		id: "TRX",
		label: "TRON",
		symbol: "TRX",
		network: "trx",
		networkLabel: "TRON",
		gecko: "tron",
		decimals: 6,
		color: "#eb0029",
		explorer: (t) => `https://tronscan.org/#/transaction/${t}`,
		uri: (a) => a
	},
	{
		id: "USDT_TRC20",
		label: "Tether",
		symbol: "USDT",
		network: "trx",
		networkLabel: "TRON · TRC-20",
		decimals: 2,
		color: "#26a17b",
		explorer: (t) => `https://tronscan.org/#/transaction/${t}`,
		uri: (a) => a
	},
	{
		id: "LTC",
		label: "Litecoin",
		symbol: "LTC",
		network: "ltc",
		networkLabel: "Litecoin",
		gecko: "litecoin",
		decimals: 8,
		color: "#345d9d",
		explorer: (t) => `https://litecoinspace.org/tx/${t}`,
		uri: (a, n) => `litecoin:${a}?amount=${n}`
	},
	{
		id: "DOGE",
		label: "Dogecoin",
		symbol: "DOGE",
		network: "doge",
		networkLabel: "Dogecoin",
		gecko: "dogecoin",
		decimals: 4,
		color: "#c2a633",
		explorer: (t) => `https://live.blockcypher.com/doge/tx/${t}/`,
		uri: (a, n) => `dogecoin:${a}?amount=${n}`
	},
	{
		id: "POL",
		label: "Polygon",
		symbol: "POL",
		network: "polygon",
		networkLabel: "Polygon",
		gecko: "polygon-ecosystem-token",
		decimals: 4,
		color: "#8247e5",
		explorer: (t) => `https://polygonscan.com/tx/${t}`,
		uri: (a) => a
	},
	{
		id: "USDT_POLYGON",
		label: "Tether",
		symbol: "USDT",
		network: "polygon",
		networkLabel: "Polygon",
		decimals: 2,
		color: "#26a17b",
		explorer: (t) => `https://polygonscan.com/tx/${t}`,
		uri: (a) => a
	},
	{
		id: "ETH_BASE",
		label: "Ether",
		symbol: "ETH",
		network: "base",
		networkLabel: "Base",
		gecko: "ethereum",
		decimals: 6,
		color: "#0052ff",
		explorer: (t) => `https://basescan.org/tx/${t}`,
		uri: (a) => a
	},
	{
		id: "USDC_BASE",
		label: "USD Coin",
		symbol: "USDC",
		network: "base",
		networkLabel: "Base",
		decimals: 2,
		color: "#2775ca",
		explorer: (t) => `https://basescan.org/tx/${t}`,
		uri: (a) => a
	}
];
const CARD = {
	id: "CARD",
	label: "Card",
	symbol: "USD",
	network: "card",
	networkLabel: "Card · Stripe",
	decimals: 2,
	color: "#635bff",
	explorer: (t) => `https://dashboard.stripe.com/payments/${t}`,
	uri: () => ""
};
function asset(id) {
	return id === "CARD" ? CARD : ASSETS.find((a) => a.id === id);
}
/** Fee for a payment: amountCents × feeBps / 100 credits, rounded down (the rules accept exactly this). */
const feeFor = (amountCents, feeBps) => Math.floor(amountCents * feeBps / 100);
//#endregion
//#region src/lib/chain.ts
/** On-chain decimals per asset (not the display decimals). */
const CHAIN_DECIMALS = {
	BTC: 8,
	ETH: 18,
	USDT_ERC20: 6,
	USDC_ERC20: 6,
	TRX: 6,
	USDT_TRC20: 6,
	LTC: 8,
	DOGE: 8,
	POL: 18,
	USDT_POLYGON: 6,
	ETH_BASE: 18,
	USDC_BASE: 6
};
const USDC_ERC20 = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT_POLYGON = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDT_ERC20 = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
/** "0.00012345" → 12345n (8 decimals). Exact, no floating point. */
function toUnits(amount, decimals) {
	const [whole, frac = ""] = amount.trim().split(".");
	const f = (frac + "0".repeat(decimals)).slice(0, decimals);
	return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(f || "0");
}
let tronGridKey = String(import.meta.env?.VITE_TRONGRID_KEY ?? "");
const setTronGridKey = (key) => {
	tronGridKey = key;
};
async function getJson(url) {
	const headers = { Accept: "application/json" };
	if (tronGridKey && url.startsWith("https://api.trongrid.io/")) headers["TRON-PRO-API-KEY"] = tronGridKey;
	const res = await fetch(url, { headers });
	if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
	return await res.json();
}
async function btcTransfers(address) {
	for (const base of ["https://mempool.space/api", "https://blockstream.info/api"]) try {
		const [txs, tip] = await Promise.all([getJson(`${base}/address/${address}/txs`), getJson(`${base}/blocks/tip/height`)]);
		return txs.flatMap((tx) => {
			const units = tx.vout.filter((o) => o.scriptpubkey_address === address).reduce((n, o) => n + BigInt(o.value), 0n);
			if (units === 0n) return [];
			const confirmations = tx.status.confirmed && tx.status.block_height ? tip - tx.status.block_height + 1 : 0;
			return [{
				txid: tx.txid,
				units,
				time: tx.status.block_time ? tx.status.block_time * 1e3 : Date.now(),
				confirmations
			}];
		});
	} catch {}
	throw new Error("Bitcoin explorers are not reachable right now");
}
async function ethTransfers(address, host = "eth.blockscout.com") {
	return (await getJson(`https://${host}/api/v2/addresses/${address}/transactions?filter=to`)).items.filter((t) => t.to?.hash?.toLowerCase() === address.toLowerCase() && t.status !== "error" && t.value !== "0").map((t) => ({
		txid: t.hash,
		units: BigInt(t.value),
		time: t.timestamp ? Date.parse(t.timestamp) : Date.now(),
		confirmations: t.confirmations ?? 0
	}));
}
async function usdtErc20Transfers(address, host = "eth.blockscout.com", token = USDT_ERC20) {
	return (await getJson(`https://${host}/api/v2/addresses/${address}/token-transfers?type=ERC-20&filter=to&token=${token}`)).items.filter((t) => t.to?.hash?.toLowerCase() === address.toLowerCase()).map((t) => ({
		txid: t.transaction_hash ?? t.tx_hash,
		units: BigInt(t.total.value),
		time: t.timestamp ? Date.parse(t.timestamp) : Date.now(),
		confirmations: 1
	}));
}
async function trxTransfers(address, since) {
	return (await getJson(`https://api.trongrid.io/v1/accounts/${address}/transactions?only_to=true&only_confirmed=true&limit=50&min_timestamp=${since}`)).data.flatMap((t) => {
		const c = t.raw_data.contract[0];
		if (c?.type !== "TransferContract" || t.ret?.[0]?.contractRet !== "SUCCESS" || !c.parameter.value.amount) return [];
		return [{
			txid: t.txID,
			units: BigInt(c.parameter.value.amount),
			time: t.block_timestamp,
			confirmations: 20
		}];
	});
}
async function usdtTrc20Transfers(address, since) {
	return (await getJson(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?only_to=true&only_confirmed=true&limit=50&contract_address=${USDT_TRC20}&min_timestamp=${since}`)).data.filter((t) => t.to === address).map((t) => ({
		txid: t.transaction_id,
		units: BigInt(t.value),
		time: t.block_timestamp,
		confirmations: 20
	}));
}
async function ltcTransfers(address) {
	const base = "https://litecoinspace.org/api";
	const [txs, tip] = await Promise.all([getJson(`${base}/address/${address}/txs`), getJson(`${base}/blocks/tip/height`)]);
	return txs.flatMap((tx) => {
		const units = tx.vout.filter((o) => o.scriptpubkey_address === address).reduce((n, o) => n + BigInt(o.value), 0n);
		if (units === 0n) return [];
		const confirmations = tx.status.confirmed && tx.status.block_height ? tip - tx.status.block_height + 1 : 0;
		return [{
			txid: tx.txid,
			units,
			time: tx.status.block_time ? tx.status.block_time * 1e3 : Date.now(),
			confirmations
		}];
	});
}
async function dogeTransfers(address) {
	const data = await getJson(`https://api.blockcypher.com/v1/doge/main/addrs/${address}?limit=50&unspentOnly=false`);
	const sums = /* @__PURE__ */ new Map();
	for (const r of [...data.unconfirmed_txrefs ?? [], ...data.txrefs ?? []]) {
		if (r.tx_input_n !== -1) continue;
		const prev = sums.get(r.tx_hash);
		const time = Date.parse(r.confirmed ?? r.received ?? "") || Date.now();
		sums.set(r.tx_hash, {
			txid: r.tx_hash,
			units: (prev?.units ?? 0n) + BigInt(r.value),
			time,
			confirmations: r.confirmations ?? 0
		});
	}
	return [...sums.values()];
}
/** Recent incoming transfers of `asset` to `address`, newest first where the explorer allows. */
async function incomingTransfers(asset, address, since = Date.now() - 1728e5) {
	switch (asset) {
		case "BTC": return btcTransfers(address);
		case "ETH": return ethTransfers(address);
		case "USDT_ERC20": return usdtErc20Transfers(address);
		case "TRX": return trxTransfers(address, since);
		case "USDT_TRC20": return usdtTrc20Transfers(address, since);
		case "USDC_ERC20": return usdtErc20Transfers(address, "eth.blockscout.com", USDC_ERC20);
		case "LTC": return ltcTransfers(address);
		case "DOGE": return dogeTransfers(address);
		case "POL": return ethTransfers(address, "polygon.blockscout.com");
		case "USDT_POLYGON": return usdtErc20Transfers(address, "polygon.blockscout.com", USDT_POLYGON);
		case "ETH_BASE": return ethTransfers(address, "base.blockscout.com");
		case "USDC_BASE": return usdtErc20Transfers(address, "base.blockscout.com", USDC_BASE);
	}
}
/**
* Finds the transfer that belongs to a checkout: sent after the checkout began,
* for (about) the unique amount we asked for, and not already claimed by
* another payment. With `txid` set, only that transaction is considered.
*/
function matchTransfer(transfers, expected, startedAt, claimed, txid) {
	const low = expected * 999n / 1000n;
	const unclaimed = transfers.filter((t) => !claimed.has(t.txid.toLowerCase()) && t.time >= startedAt - 3e5);
	if (txid) {
		const t = unclaimed.find((x) => x.txid.toLowerCase() === txid.toLowerCase());
		return t ? {
			transfer: t,
			enough: t.units >= low
		} : null;
	}
	const high = expected * 1001n / 1000n;
	const exact = unclaimed.find((t) => t.units === expected);
	if (exact) return {
		transfer: exact,
		enough: true
	};
	const near = unclaimed.filter((t) => t.units >= low && t.units <= high).sort((a, b) => {
		const da = a.units > expected ? a.units - expected : expected - a.units;
		const db = b.units > expected ? b.units - expected : expected - b.units;
		return da < db ? -1 : da > db ? 1 : 0;
	})[0];
	return near ? {
		transfer: near,
		enough: true
	} : null;
}
//#endregion
//#region scripts/watcher/watcher.ts
/**
* Surfi Box payment watcher — the VB "CheckTimer" running on a trusted machine (GitHub Actions).
*
* Every 30 seconds: reads every open payment, looks at the receiving address on a public block explorer,
* and when the exact unique amount arrives with enough confirmations, marks the payment paid, takes the
* platform fee from the merchant's balance and writes the ledger + activity — with the Firebase Admin key,
* which never leaves this machine. Payments are recorded even when no dashboard is open.
*
* Env: FIREBASE_SERVICE_ACCOUNT (the service-account JSON), FIREBASE_DATABASE_URL,
*      RUN_SECONDS (how long one run keeps checking, default 270), EVERY_SECONDS (default 30).
* Bundled with:  npm run watcher:build   (see package.json)
*/
const HOUR = 36e5;
/** Unseen payments are watched for 24 h; ones already seen on chain for 7 days (slow confirmations). */
const WINDOW = 24 * HOUR;
const DETECTED_WINDOW = 168 * HOUR;
/** Confirmations required when the merchant hasn't chosen (BTC, ETH, LTC, DOGE). */
const DEFAULT_CONFIRMATIONS = 3;
const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
const url = process.env.FIREBASE_DATABASE_URL;
if (!account.private_key || !url) {
	console.error("Set FIREBASE_SERVICE_ACCOUNT and FIREBASE_DATABASE_URL.");
	process.exit(1);
}
if (process.env.TRONGRID_API_KEY) setTronGridKey(process.env.TRONGRID_API_KEY);
const app = initializeApp({
	credential: cert(account),
	databaseURL: url
});
const db = getDatabase(app);
const read = async (path) => (await db.ref(path).get()).val();
const log = (...a) => console.log((/* @__PURE__ */ new Date()).toISOString().slice(11, 19), ...a);
/** Same rule as the dashboards: the merchant's choice applies to coins with real confirmation counts. */
function needed(inv, merchantConfirmations) {
	if (![
		"BTC",
		"ETH",
		"LTC",
		"DOGE"
	].includes(inv.asset)) return 1;
	return Math.max(1, merchantConfirmations);
}
async function feeBpsFor(uid) {
	const own = await read(`merchants/${uid}/feeBps`);
	if (typeof own === "number") return own;
	return await read("platform/settings/feeBps") ?? 100;
}
/** Marks one payment paid. Claims the transaction first so it can never pay two invoices. */
async function confirm(inv, txid, confirmations) {
	if (!(await db.ref(`claims/${inv.asset}_${txid}`).transaction((cur) => cur === null || cur === inv.id ? inv.id : void 0)).committed) return false;
	const flip = await db.ref(`invoices/${inv.id}/status`).transaction((s) => s === null ? null : s === "awaiting" || s === "expired" ? "paid" : void 0);
	if (!flip.committed || flip.snapshot.val() !== "paid") return false;
	const now = Date.now();
	const a = asset(inv.asset);
	const updates = {
		[`invoices/${inv.id}/paidAt`]: now,
		[`invoices/${inv.id}/txid`]: txid,
		[`invoices/${inv.id}/detectedTxid`]: txid,
		[`invoices/${inv.id}/confirmations`]: confirmations,
		[`invoices/${inv.id}/confirmedBy`]: "system",
		[`open/${inv.uid}/${inv.id}`]: null
	};
	if (inv.kind === "deposit") {
		const credits = inv.amountCents * 100;
		updates[`balances/${inv.uid}`] = ServerValue.increment(credits);
		updates[`ledger/${inv.uid}/${inv.id}`] = {
			type: "deposit",
			credits,
			invoiceId: inv.id,
			note: `${inv.cryptoAmount} ${a.symbol}`,
			at: now
		};
		updates[`activity/${inv.uid}/${inv.id}`] = {
			kind: "deposit",
			text: `Deposit of $${inv.amountUsd.toFixed(2)} added to your balance`,
			invoiceId: inv.id,
			at: now
		};
	} else {
		const feeBps = await feeBpsFor(inv.uid);
		const fee = feeFor(inv.amountCents, feeBps);
		updates[`invoices/${inv.id}/feeBps`] = feeBps;
		updates[`invoices/${inv.id}/feeCredits`] = fee;
		updates[`balances/${inv.uid}`] = ServerValue.increment(-fee);
		updates[`ledger/${inv.uid}/${inv.id}`] = {
			type: "fee",
			credits: -fee,
			invoiceId: inv.id,
			note: inv.title,
			at: now
		};
		updates[`activity/${inv.uid}/${inv.id}`] = {
			kind: "paid",
			text: `Received $${inv.amountUsd.toFixed(2)} in ${a.symbol} — ${inv.title}`,
			invoiceId: inv.id,
			at: now
		};
		if (inv.linkId) {
			const link = await read(`links/${inv.linkId}`);
			if (link) {
				updates[`links/${inv.linkId}/uses`] = ServerValue.increment(1);
				if (link.maxUses && (link.uses ?? 0) + 1 >= link.maxUses) updates[`links/${inv.linkId}/closed`] = true;
			}
		}
	}
	await db.ref().update(updates);
	log(`PAID ${inv.id} ${inv.cryptoAmount} ${a.symbol} (${inv.kind}) tx ${txid.slice(0, 16)}…`);
	return true;
}
/** One pass over every open payment — the VB CheckBTCPayment, for all merchants and coins. */
async function tick() {
	const open = await read("open") ?? {};
	const pairs = Object.entries(open).flatMap(([uid, ids]) => Object.keys(ids ?? {}).map((id) => [uid, id]));
	if (!pairs.length) return log("no open payments");
	const now = Date.now();
	const live = [];
	for (const [uid, id] of pairs) {
		const raw = await read(`invoices/${id}`);
		const inv = raw ? {
			...raw,
			id
		} : null;
		const age = inv ? now - inv.createdAt : Infinity;
		if (!inv || inv.asset === "CARD" || inv.status === "paid" || inv.status === "cancelled" || age > (inv.detectedTxid ? DETECTED_WINDOW : WINDOW)) {
			await db.ref(`open/${uid}/${id}`).remove();
			continue;
		}
		if (inv.status === "awaiting" && now > inv.expiresAt && !inv.detectedTxid) await db.ref(`invoices/${id}/status`).set("expired");
		live.push(inv);
	}
	const confs = /* @__PURE__ */ new Map();
	for (const uid of new Set(live.map((i) => i.uid))) confs.set(uid, await read(`merchants/${uid}/settings/confirmations`) ?? DEFAULT_CONFIRMATIONS);
	const groups = /* @__PURE__ */ new Map();
	for (const inv of live) groups.set(`${inv.asset}|${inv.address}`, [...groups.get(`${inv.asset}|${inv.address}`) ?? [], inv]);
	let paid = 0;
	for (const list of groups.values()) {
		const { asset: id, address } = list[0];
		let transfers;
		try {
			transfers = await incomingTransfers(id, address, Math.min(...list.map((i) => i.createdAt)) - 6e5);
		} catch (e) {
			log(`${id} explorer busy: ${e instanceof Error ? e.message : e}`);
			continue;
		}
		const taken = /* @__PURE__ */ new Set();
		for (const inv of [...list].sort((a, b) => a.createdAt - b.createdAt)) {
			const expected = toUnits(inv.cryptoAmount, CHAIN_DECIMALS[inv.asset]);
			for (let attempt = 0; attempt < 4; attempt++) {
				const m = matchTransfer(transfers, expected, inv.createdAt, taken);
				if (!m) break;
				const tx = m.transfer.txid.toLowerCase();
				const owner = await read(`claims/${inv.asset}_${tx}`);
				if (owner && owner !== inv.id) {
					taken.add(tx);
					continue;
				}
				const need = needed(inv, confs.get(inv.uid) ?? DEFAULT_CONFIRMATIONS);
				if (m.transfer.confirmations < need) {
					if (inv.detectedTxid !== tx || inv.confirmations !== m.transfer.confirmations) {
						await db.ref(`invoices/${inv.id}`).update({
							detectedTxid: tx,
							confirmations: m.transfer.confirmations,
							confirmationsNeeded: need
						});
						log(`seen ${inv.id} ${m.transfer.confirmations}/${need} confirmations`);
					}
					break;
				}
				if (await confirm(inv, tx, m.transfer.confirmations)) paid++;
				taken.add(tx);
				break;
			}
		}
	}
	log(`checked ${live.length} open payment(s), ${paid} confirmed`);
}
const runFor = Number(process.env.RUN_SECONDS || 270) * 1e3;
const every = Number(process.env.EVERY_SECONDS || 30) * 1e3;
const started = Date.now();
for (;;) {
	try {
		await tick();
	} catch (e) {
		log("check failed:", e instanceof Error ? e.message : e);
	}
	if (Date.now() - started + every > runFor) break;
	await new Promise((r) => setTimeout(r, every));
}
await deleteApp(app);
if (process.platform !== "win32") process.exit(0);
//#endregion
export {};
