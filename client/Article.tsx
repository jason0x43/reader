import { datetime, React, forwardRef, useCallback } from "./deps.ts";
import { Article as ArticleType } from "../types.ts";
import { className } from './util.ts';

function pluralize(str: string, val: number): string {
  return `${str}${val === 1 ? "" : "s"}`;
}

function getAge(timestamp: number | undefined): string {
  if (timestamp === undefined) {
    return "?";
  }

  const date0 = new Date();
  const date1 = new Date(timestamp);
  const diff = datetime.difference(date0, date1, {
    units: ["minutes", "hours", "days", "weeks"],
  });
  if (diff.weeks) {
    return `${diff.weeks} ${pluralize("week", diff.weeks)}`;
  }
  if (diff.days) {
    return `${diff.days} ${pluralize("day", diff.days)}`;
  }
  if (diff.hours) {
    return `${diff.hours} ${pluralize("hour", diff.hours ?? 0)}`;
  }
  return `${diff.minutes} ${pluralize("minute", diff.minutes ?? 0)}`;
}

export interface ArticleProps {
  article: ArticleType;
  selectedArticle: number | undefined;
  selectArticle: (id: number) => void;
}

const Article = forwardRef<HTMLDivElement, ArticleProps>((props, ref) => {
  const { article, selectArticle, selectedArticle } = props;

  const handleSelect = useCallback(() => {
    selectArticle(article.id);
  }, [article, selectedArticle]);

  const cls = className('Article', {
    'Article-selected': selectedArticle === article.id
  });

  return (
    <div className={cls} ref={ref}>
      <div className="Article-heading" onClick={handleSelect}>
        <div className="Article-title">{article.title}</div>
        <div className="Article-age">{getAge(article.published)}</div>
      </div>
      {selectedArticle === article.id && (
        <div
          className="Article-content"
          dangerouslySetInnerHTML={{ __html: article.content ?? "" }}
        />
      )}
    </div>
  );
});

export default Article;