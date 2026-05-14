import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    route("auth", "routes/auth.tsx"),
    layout("routes/protected.tsx", [
        index("routes/home.tsx"),
        route("upload", "routes/upload.tsx"),
        route("resume/:id", "routes/resume.tsx"),
        route("wipe", "routes/wipe.tsx"),
    ]),
] satisfies RouteConfig;
