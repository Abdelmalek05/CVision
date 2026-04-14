import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/feedback/Summary";
import ATS from "~/components/feedback/ATS";
import Details from "~/components/feedback/Details";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const navigate = useNavigate();

    const coerceNumber = (value: unknown, fallback = 0) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim().length) {
            const n = Number(value);
            if (Number.isFinite(n)) return n;
        }
        return fallback;
    };

    const normalizeFeedback = (value: unknown): Feedback | null => {
        if(!value || typeof value !== 'object') return null;
        const v: any = value;

        const normalizeATSTips = (tips: unknown): Feedback['ATS']['tips'] => {
            if(!Array.isArray(tips)) return [];
            return tips
                .map((t) => {
                    const type: "good" | "improve" = t?.type === 'good' ? 'good' : 'improve';
                    const tip = typeof t?.tip === 'string' ? t.tip : '';
                    return { type, tip };
                })
                .filter((t) => t.tip.length > 0);
        };

        const normalizeTips = (
            tips: unknown
        ): Feedback['toneAndStyle']['tips'] => {
            if(!Array.isArray(tips)) return [];
            return tips
                .map((t) => {
                    const type: "good" | "improve" = t?.type === 'good' ? 'good' : 'improve';
                    const tip = typeof t?.tip === 'string' ? t.tip : '';
                    const explanation = typeof t?.explanation === 'string' ? t.explanation : '';
                    return { type, tip, explanation };
                })
                .filter((t) => t.tip.length > 0);
        };

        // Accept a few common variants from LLMs (ATS/ats)
        const ats = v.ATS ?? v.ats ?? {};

        const normalized: Feedback = {
            overallScore: coerceNumber(v.overallScore),
            ATS: {
                score: coerceNumber(ats.score),
                tips: normalizeATSTips(ats.tips),
            },
            toneAndStyle: {
                score: coerceNumber(v.toneAndStyle?.score),
                tips: normalizeTips(v.toneAndStyle?.tips),
            },
            content: {
                score: coerceNumber(v.content?.score),
                tips: normalizeTips(v.content?.tips),
            },
            structure: {
                score: coerceNumber(v.structure?.score),
                tips: normalizeTips(v.structure?.tips),
            },
            skills: {
                score: coerceNumber(v.skills?.score),
                tips: normalizeTips(v.skills?.tips),
            },
        };

        // If it still looks empty, treat as invalid
        const hasAnyScore =
            normalized.overallScore > 0 ||
            normalized.ATS.score > 0 ||
            normalized.toneAndStyle.score > 0 ||
            normalized.content.score > 0 ||
            normalized.structure.score > 0 ||
            normalized.skills.score > 0;

        return hasAnyScore ? normalized : null;
    };

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            try {
                // KV can be briefly stale right after redirect; retry a few times
                const maxAttempts = 8;
                const attemptDelayMs = 400;

                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    const resume = await kv.get(`resume:${id}`);
                    if(!resume) return;

                    const data = JSON.parse(resume);

                    const resumeBlob = await fs.read(data.resumePath);
                    if(!resumeBlob) return;

                    const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                    const resumeUrl = URL.createObjectURL(pdfBlob);
                    setResumeUrl(resumeUrl);

                    const imageBlob = await fs.read(data.imagePath);
                    if(!imageBlob) return;
                    const imageUrl = URL.createObjectURL(imageBlob);
                    setImageUrl(imageUrl);

                    // feedback might be stored either as an object or as a JSON string
                    let loadedFeedback: unknown = data.feedback;
                    if(typeof loadedFeedback === 'string' && loadedFeedback.trim().length) {
                        try { loadedFeedback = JSON.parse(loadedFeedback); } catch { /* ignore */ }
                    }

                    const normalized = normalizeFeedback(loadedFeedback);
                    if (normalized) {
                        setFeedback(normalized);
                        console.log({resumeUrl, imageUrl, feedback: loadedFeedback });
                        return;
                    }

                    // If analysis isn't ready yet, wait and retry
                    await new Promise((r) => setTimeout(r, attemptDelayMs));
                }
            } finally {
                setHasLoaded(true);
            }
        }

        loadResume();
    }, [id]);

    const showIncompleteFeedbackState = hasLoaded && !feedback;

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
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
                        <div className="bg-white rounded-2xl shadow-md w-full p-6 mt-6">
                            <p className="text-xl font-semibold text-gray-900">We couldn&apos;t load your feedback.</p>
                            <p className="text-gray-600 mt-2">
                                This usually happens if the analysis result wasn&apos;t saved correctly or the stored data is incomplete.
                                Please go back and analyze again.
                            </p>
                            <div className="mt-4">
                                <Link to="/upload" className="primary-button inline-block">Analyze another resume</Link>
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