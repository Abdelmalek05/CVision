const coerceNumber = (value: unknown, fallback = 0) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length) {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
};

const normalizeATSTips = (tips: unknown): Feedback["ATS"]["tips"] => {
    if (!Array.isArray(tips)) return [];
    return tips
        .map((t) => {
            const type: "good" | "improve" = t?.type === "good" ? "good" : "improve";
            const tip = typeof t?.tip === "string" ? t.tip : "";
            return { type, tip };
        })
        .filter((t) => t.tip.length > 0);
};

const normalizeTips = (tips: unknown): Feedback["toneAndStyle"]["tips"] => {
    if (!Array.isArray(tips)) return [];
    return tips
        .map((t) => {
            const type: "good" | "improve" = t?.type === "good" ? "good" : "improve";
            const tip = typeof t?.tip === "string" ? t.tip : "";
            const explanation = typeof t?.explanation === "string" ? t.explanation : "";
            return { type, tip, explanation };
        })
        .filter((t) => t.tip.length > 0);
};

export const normalizeFeedback = (value: unknown): Feedback | null => {
    if (!value || typeof value !== "object") return null;
    const v: any = value;

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

    const hasAnyScore =
        normalized.overallScore > 0 ||
        normalized.ATS.score > 0 ||
        normalized.toneAndStyle.score > 0 ||
        normalized.content.score > 0 ||
        normalized.structure.score > 0 ||
        normalized.skills.score > 0;

    return hasAnyScore ? normalized : null;
};

const extractJsonString = (raw: string): string => {
    let s = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        s = s.slice(firstBrace, lastBrace + 1);
    }
    return s.trim();
};

export const parseFeedbackResponse = (raw: string): Feedback | null => {
    if (!raw) return null;
    const jsonText = extractJsonString(raw);
    if (!jsonText) return null;
    try {
        const parsed = JSON.parse(jsonText);
        return normalizeFeedback(parsed);
    } catch {
        return null;
    }
};
