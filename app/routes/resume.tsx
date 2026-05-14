import {Link, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import {normalizeFeedback, parseFeedbackResponse, extractFeedbackText} from "~/lib/feedback";
import {prepareInstructions} from "../../constants";
import Summary from "~/components/feedback/Summary";
import ATS from "~/components/feedback/ATS";
import Details from "~/components/feedback/Details";

interface StoredResume {
    id: string;
    resumePath: string;
    imagePath: string;
    companyName?: string;
    jobTitle?: string;
    jobDescription?: string;
    feedback: unknown;
}

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { fs, kv, ai } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [storedResume, setStoredResume] = useState<StoredResume | null>(null);
    const [reanalyzing, setReanalyzing] = useState(false);
    const [reanalyzeStatus, setReanalyzeStatus] = useState<string | null>(null);
    const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const createdUrls: string[] = [];

        const loadResume = async () => {
            try {
                // KV can be briefly stale right after a fresh upload's redirect; retry only
                // while `feedback` is still empty (the legitimate stale-write window).
                // If `feedback` is already populated but can't be normalized, that's a
                // permanent failure — no point looping.
                const maxAttempts = 8;
                const attemptDelayMs = 400;

                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    if (cancelled) return;

                    const resume = await kv.get(`resume:${id}`);
                    if (!resume) return;

                    const data = JSON.parse(resume) as StoredResume;
                    if (cancelled) return;
                    setStoredResume(data);

                    const resumeBlob = await fs.read(data.resumePath);
                    if (cancelled) return;
                    if (resumeBlob) {
                        const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                        const url = URL.createObjectURL(pdfBlob);
                        createdUrls.push(url);
                        setResumeUrl(url);
                    }

                    const imageBlob = await fs.read(data.imagePath);
                    if (cancelled) return;
                    if (imageBlob) {
                        const url = URL.createObjectURL(imageBlob);
                        createdUrls.push(url);
                        setImageUrl(url);
                    }

                    let loadedFeedback: unknown = data.feedback;
                    if (typeof loadedFeedback === 'string' && loadedFeedback.trim().length) {
                        try { loadedFeedback = JSON.parse(loadedFeedback); } catch { /* ignore */ }
                    }

                    const normalized = normalizeFeedback(loadedFeedback);
                    if (normalized) {
                        setFeedback(normalized);
                        return;
                    }

                    const feedbackHasContent =
                        loadedFeedback !== null &&
                        loadedFeedback !== undefined &&
                        loadedFeedback !== '' &&
                        (typeof loadedFeedback !== 'object' ||
                            Object.keys(loadedFeedback as object).length > 0);

                    if (feedbackHasContent) {
                        // Data is settled but unparseable — surface the re-analyze UI immediately.
                        return;
                    }

                    await new Promise((r) => setTimeout(r, attemptDelayMs));
                }
            } finally {
                if (!cancelled) setHasLoaded(true);
            }
        }

        loadResume();

        return () => {
            cancelled = true;
            for (const url of createdUrls) URL.revokeObjectURL(url);
        };
    }, [id]);

    const handleReanalyze = async () => {
        if (!storedResume || !id) return;
        setReanalyzing(true);
        setReanalyzeError(null);
        setReanalyzeStatus('Checking the stored resume file...');

        const pdfBlob = await fs.read(storedResume.resumePath);
        if (!pdfBlob) {
            setReanalyzing(false);
            setReanalyzeStatus(null);
            setReanalyzeError(`The original PDF (${storedResume.resumePath}) is no longer in storage, so we can't re-analyze it. You'll need to upload it again.`);
            return;
        }

        setReanalyzeStatus('Running the AI analysis...');
        let response = await ai.feedback(
            storedResume.resumePath,
            prepareInstructions({
                jobTitle: storedResume.jobTitle || '',
                jobDescription: storedResume.jobDescription || '',
            })
        );
        let newFeedback = response ? parseFeedbackResponse(extractFeedbackText(response)) : null;

        if (!newFeedback) {
            setReanalyzeStatus('Retrying with stricter format...');
            response = await ai.feedback(
                storedResume.resumePath,
                prepareInstructions({
                    jobTitle: storedResume.jobTitle || '',
                    jobDescription: storedResume.jobDescription || '',
                    strict: true,
                })
            );
            newFeedback = response ? parseFeedbackResponse(extractFeedbackText(response)) : null;
        }

        if (!newFeedback) {
            setReanalyzing(false);
            setReanalyzeStatus(null);
            setReanalyzeError('The AI returned a response we could not parse, even after a retry. Try again in a moment.');
            return;
        }

        setReanalyzeStatus('Saving updated feedback...');
        const updated: StoredResume = { ...storedResume, feedback: newFeedback };
        await kv.set(`resume:${id}`, JSON.stringify(updated));
        setStoredResume(updated);
        setFeedback(newFeedback);
        setReanalyzing(false);
        setReanalyzeStatus(null);
    };

    const showIncompleteFeedbackState = hasLoaded && !feedback;
    const canReanalyze = Boolean(storedResume?.resumePath);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS?.score ?? 0} suggestions={feedback.ATS?.tips ?? []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : showIncompleteFeedbackState ? (
                        <div className="bg-white rounded-2xl shadow-md w-full p-6 mt-6 flex flex-col gap-4">
                            <div>
                                <p className="text-xl font-semibold text-gray-900">The feedback for this resume is missing or incomplete.</p>
                                <p className="text-gray-600 mt-2">
                                    The original PDF is still saved. Click below to re-run the AI analysis on it — your existing record will be updated in place.
                                </p>
                            </div>
                            {reanalyzeStatus && <p className="text-gray-700 text-sm">{reanalyzeStatus}</p>}
                            {reanalyzeError && (
                                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                                    {reanalyzeError}
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {canReanalyze && (
                                    <button
                                        type="button"
                                        onClick={handleReanalyze}
                                        disabled={reanalyzing}
                                        className="primary-button w-fit disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {reanalyzing ? 'Re-analyzing...' : 'Analyze this resume now'}
                                    </button>
                                )}
                                <Link to="/upload" className="text-blue-600 hover:underline self-center">
                                    Or upload a new one
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
