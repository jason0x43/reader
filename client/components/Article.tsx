import { React } from "../deps.ts";
import { Article } from "../../types.ts";
import { unescapeHtml } from "../../util.ts";

export interface ArticleProps {
  article: Article;
  onClose: () => void;
}

const Article: React.FC<ArticleProps> = (props) => {
  const { article, onClose } = props;

  return (
    <div className="Article">
      <div className="Article-inner">
        <div className="Article-header">
          <a
            href={article.link}
            target={"_blank"}
          >
            {article.title}
          </a>
          <div className="Article-close" onClick={onClose}>
            ×
          </div>
        </div>
        <div
          className="Article-content"
          dangerouslySetInnerHTML={{
            __html: unescapeHtml(article.content ?? ""),
          }}
        />
      </div>
    </div>
  );
};

export default Article;
