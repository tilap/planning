import { env } from "@/env";
import { shortGitSha } from "@/lib/build-info";
import { EventListScreen } from "./_components/event-list-screen";

export default function HomePage() {
	return <EventListScreen buildSha={shortGitSha(env.GIT_COMMIT_SHA)} />;
}
