import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import ConfirmDialog from "~/components/ConfirmDialog";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, fs, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeKeys, setResumeKeys] = useState<Record<string, string>>({});
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if(!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const items = (await kv.list('resume:*', true)) as KVItem[];

      const keys: Record<string, string> = {};
      const parsedResumes = items?.flatMap((item) => {
        try {
          const parsed = JSON.parse(item.value) as Resume;
          keys[parsed.id] = item.key;
          return [parsed];
        } catch (err) {
          console.warn(`Skipping unparseable KV entry ${item.key}`, err);
          return [];
        }
      })

      setResumes(parsedResumes || []);
      setResumeKeys(keys);
      setLoadingResumes(false);
    }

    loadResumes()
  }, []);

  const requestDelete = (id: string) => {
    if (deletingId) return;
    setDeleteError(null);
    setPendingDeleteId(id);
  };

  const cancelDelete = () => {
    if (deletingId) return;
    setPendingDeleteId(null);
  };

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    if (!id) return;
    const resume = resumes.find((r) => r.id === id);
    if (!resume) {
      setPendingDeleteId(null);
      return;
    }

    setDeletingId(id);
    if (resume.resumePath) {
      try { await fs.delete(resume.resumePath); } catch (err) {
        console.warn(`Failed to delete ${resume.resumePath}`, err);
      }
    }
    if (resume.imagePath) {
      try { await fs.delete(resume.imagePath); } catch (err) {
        console.warn(`Failed to delete ${resume.imagePath}`, err);
      }
    }

    const kvKey = resumeKeys[id] ?? `resume:${id}`;
    let kvDeleted = false;
    try {
      const result = await kv.delete(kvKey);
      console.log(`[delete] kv.delete(${kvKey}) returned`, result);
      const stillThere = await kv.get(kvKey);
      console.log(`[delete] kv.get(${kvKey}) after delete:`, stillThere);
      kvDeleted = stillThere === null || stillThere === undefined;
    } catch (err) {
      console.warn(`Failed to delete KV key ${kvKey}`, err);
    }

    if (kvDeleted) {
      setResumes((prev) => prev.filter((r) => r.id !== id));
      setResumeKeys((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDeleteError(null);
    } else {
      setDeleteError(
        `Couldn't delete this resume from storage (key: ${kvKey}). It may reappear on refresh. Check the browser console.`
      );
    }

    setDeletingId(null);
    setPendingDeleteId(null);
  };

  const pendingResume = pendingDeleteId
    ? resumes.find((r) => r.id === pendingDeleteId) ?? null
    : null;
  const pendingLabel = pendingResume
    ? pendingResume.companyName || pendingResume.jobTitle || "this resume"
    : "";

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
        ): (
          <h2>Review your submissions and check AI-powered feedback.</h2>
        )}
      </div>
      {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
      )}

      {deleteError && (
        <div className="max-w-2xl mx-auto mb-6 px-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start justify-between gap-3">
            <p className="text-sm">{deleteError}</p>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!loadingResumes && resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume) => (
              <ResumeCard
                  key={resume.id}
                  resume={resume}
                  onDelete={requestDelete}
                  isDeleting={deletingId === resume.id}
              />
          ))}
        </div>
      )}

      {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
      )}
    </section>

    <ConfirmDialog
      open={pendingDeleteId !== null}
      title="Delete resume?"
      message={`This will permanently delete ${pendingLabel} along with its PDF, preview image, and feedback. This cannot be undone.`}
      confirmLabel="Delete resume"
      isProcessing={deletingId !== null}
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
    />
  </main>
}