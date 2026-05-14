import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {parseFeedbackResponse, extractFeedbackText} from "~/lib/feedback";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

    const fail = (message: string) => {
        setError(message);
        setIsProcessing(false);
        setStatusText('');
    };

    const resetAfterError = () => {
        setError(null);
        setIsProcessing(false);
        setStatusText('');
    };

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setError(null);
        setIsProcessing(true);

        setStatusText('Uploading the file...');
        const uploadedFile = await fs.upload([file]);
        if(!uploadedFile) return fail('Failed to upload your resume. Check your connection and try again.');

        setStatusText('Converting to image...');
        const imageFile = await convertPdfToImage(file);
        if(!imageFile.file) return fail(`Could not render your PDF${imageFile.error ? ` (${imageFile.error})` : ''}. Make sure the file isn't corrupt or password-protected.`);

        setStatusText('Uploading the image...');
        const uploadedImage = await fs.upload([imageFile.file]);
        if(!uploadedImage) return fail('Failed to upload the resume preview image. Try again.');

        setStatusText('Analyzing your resume...');

        let response = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({ jobTitle, jobDescription })
        );

        const cleanupUploads = async () => {
            try { await fs.delete(uploadedFile.path); } catch {}
            try { if (uploadedImage) await fs.delete(uploadedImage.path); } catch {}
        };

        if (!response) {
            await cleanupUploads();
            return fail('The AI analyzer did not respond. Try again in a moment.');
        }

        let feedback = parseFeedbackResponse(extractFeedbackText(response));

        if (!feedback) {
            setStatusText('Retrying with stricter format...');
            response = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription, strict: true })
            );
            if (response) {
                feedback = parseFeedbackResponse(extractFeedbackText(response));
            }
        }

        if (!feedback) {
            await cleanupUploads();
            return fail('The AI returned a response we could not parse, even after a retry. Please try again — sometimes a fresh attempt produces cleaner output.');
        }

        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName, jobTitle, jobDescription,
            feedback,
        };
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText('Analysis complete, redirecting...');
        navigate(`/resume/${uuid}`);
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) return;

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>

                    {error ? (
                        <div className="mt-8 max-w-xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-red-800">Something went wrong</h2>
                                <p className="text-red-700 mt-2">{error}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={resetAfterError}
                                    className="primary-button w-fit"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}

                    {!isProcessing && !error && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
