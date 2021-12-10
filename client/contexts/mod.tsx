import { React } from "../deps.ts";
import { UserProvider } from "./UserContext.tsx";
import { ArticlesProvider } from "./ArticlesContext.tsx";
import { FeedStatsProvider } from "./FeedStatsContext.tsx";
import { ContextMenuProvider } from "./ContextMenuContext.tsx";
import { Article, FeedStats, User } from "../../types.ts";

export interface ContextProps {
  user?: User;
  selectedFeeds?: number[];
  articles?: Article[];
  feedStats?: FeedStats;
}

export const ContextContainer: React.FC<ContextProps> = (props) => {
  return (
    <UserProvider user={props.user}>
      <ContextMenuProvider>
        <FeedStatsProvider feedStats={props.feedStats}>
          <ArticlesProvider articles={props.articles}>
            {props.children}
          </ArticlesProvider>
        </FeedStatsProvider>
      </ContextMenuProvider>
    </UserProvider>
  );
};

export { useFeedStats } from './FeedStatsContext.tsx';
export { useUser } from './UserContext.tsx';
export { useArticles } from './ArticlesContext.tsx';
export { useContextMenu } from './ContextMenuContext.tsx';
