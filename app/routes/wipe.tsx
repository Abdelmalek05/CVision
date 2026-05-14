import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";

interface AppResumeRecord {
    key: string;
    resumePath?: string;
    imagePath?: string;
    companyName?: string;
    jobTitle?: string;
}

const WipeApp = () => {
    const { auth, isLoading, error, fs, kv } = usePuterStore();
    const [records, setRecords] = useState<AppResumeRecord[]>([]);
    const [confirming, setConfirming] = useState(false);
    const [isWiping, setIsWiping] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const loadRecords = async () => {
        const items = (await kv.list("resume:*", true)) as KVItem[] | undefined;
        if (!items) return setRecords([]);

        const parsed = items.flatMap<AppResumeRecord>((item) => {
            try {
                const data = JSON.parse(item.value);
                return [{
                    key: item.key,
                    resumePath: data.resumePath,
                    imagePath: data.imagePath,
                    companyName: data.companyName,
                    jobTitle: data.jobTitle,
                }];
            } catch {
                return [{ key: item.key }];
            }
        });
        setRecords(parsed);
    };

    useEffect(() => {
        loadRecords();
    }, []);

    const handleDelete = async () => {
        setIsWiping(true);
        setStatus("Deleting files and records...");

        for (const record of records) {
            if (record.resumePath) {
                try { await fs.delete(record.resumePath); } catch (err) {
                    console.warn(`Failed to delete ${record.resumePath}`, err);
                }
            }
            if (record.imagePath) {
                try { await fs.delete(record.imagePath); } catch (err) {
                    console.warn(`Failed to delete ${record.imagePath}`, err);
                }
            }
            try { await kv.delete(record.key); } catch (err) {
                console.warn(`Failed to delete KV key ${record.key}`, err);
            }
        }

        setStatus(`Deleted ${records.length} resume record${records.length === 1 ? "" : "s"}.`);
        setConfirming(false);
        setIsWiping(false);
        await loadRecords();
    };

    if (isLoading) {
        return <div className="p-8">Loading...</div>;
    }

    if (error) {
        return <div className="p-8">Error {error}</div>;
    }

    return (
        <main className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold">Wipe App Data</h1>
                <p className="text-gray-600 text-sm mt-1">
                    Authenticated as <span className="font-semibold">{auth.user?.username}</span>.
                    This only deletes resumes uploaded through this app — other Puter files are untouched.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <h2 className="font-semibold">
                    {records.length === 0
                        ? "No resume records found."
                        : `${records.length} resume record${records.length === 1 ? "" : "s"} will be deleted:`}
                </h2>
                <ul className="flex flex-col gap-1 text-sm">
                    {records.map((r) => (
                        <li key={r.key} className="border rounded p-2">
                            <div className="font-mono text-xs text-gray-500">{r.key}</div>
                            {(r.companyName || r.jobTitle) && (
                                <div>{[r.companyName, r.jobTitle].filter(Boolean).join(" — ")}</div>
                            )}
                            {r.resumePath && <div className="text-gray-600">PDF: {r.resumePath}</div>}
                            {r.imagePath && <div className="text-gray-600">Image: {r.imagePath}</div>}
                        </li>
                    ))}
                </ul>
            </div>

            {status && <div className="text-sm text-gray-700">{status}</div>}

            {records.length > 0 && !confirming && (
                <button
                    className="bg-red-600 text-white px-4 py-2 rounded-md cursor-pointer w-fit"
                    onClick={() => setConfirming(true)}
                    disabled={isWiping}
                >
                    Wipe App Data
                </button>
            )}

            {confirming && (
                <div className="flex flex-col gap-3 border border-red-300 bg-red-50 rounded p-4">
                    <p className="font-semibold">
                        Permanently delete {records.length} resume record{records.length === 1 ? "" : "s"} and {records.filter(r => r.resumePath || r.imagePath).length * 2} associated files?
                    </p>
                    <p className="text-sm text-gray-700">This cannot be undone.</p>
                    <div className="flex gap-2">
                        <button
                            className="bg-red-600 text-white px-4 py-2 rounded-md cursor-pointer disabled:opacity-50"
                            onClick={handleDelete}
                            disabled={isWiping}
                        >
                            {isWiping ? "Deleting..." : "Yes, delete everything"}
                        </button>
                        <button
                            className="bg-gray-200 px-4 py-2 rounded-md cursor-pointer"
                            onClick={() => setConfirming(false)}
                            disabled={isWiping}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};

export default WipeApp;
