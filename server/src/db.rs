use crate::{
    error::AppError,
    rss::{get_content, get_icon, load_feed},
    types::{
        Article, ArticleId, Feed, FeedGroup, FeedGroupFeed, FeedGroupFeedId,
        FeedGroupId, FeedId, FeedKind, FeedLog, FeedLogId, Password,
        PasswordId, Session, SessionId, User, UserId,
    },
    util::{get_timestamp, hash_password},
};
use serde_json::json;
use sqlx::{query, query_as, SqliteConnection};
use time::OffsetDateTime;
use url::Url;
use uuid::Uuid;

impl User {
    pub(crate) async fn create(
        conn: &mut SqliteConnection,
        email: String,
        username: String,
    ) -> Result<Self, AppError> {
        let user = Self {
            id: UserId(Uuid::new_v4()),
            email,
            username,
            config: None,
        };

        query!(
            r#"
            INSERT INTO users (id, email, username, config)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            user.id,
            user.email,
            user.username,
            user.config
        )
        .execute(conn)
        .await?;

        Ok(user)
    }

    pub(crate) async fn get_by_username(
        conn: &mut SqliteConnection,
        username: String,
    ) -> Result<Self, AppError> {
        query_as!(
            User,
            r#"
            SELECT
              id AS "id!: Uuid",
              email,
              username,
              config AS "config: serde_json::Value"
            FROM users
            WHERE username = ?1
            "#,
            username
        )
        .fetch_one(conn)
        .await
        .map_err(|_| AppError::UserNotFound)
    }

    pub(crate) async fn get_all(
        conn: &mut SqliteConnection,
    ) -> Result<Vec<Self>, AppError> {
        query_as!(
            User,
            r#"
            SELECT
              id AS "id!: Uuid",
              email,
              username,
              config AS "config: serde_json::Value"
            FROM users
            "#
        )
        .fetch_all(conn)
        .await
        .map_err(AppError::SqlxError)
    }
}

impl Password {
    pub(crate) async fn create(
        conn: &mut SqliteConnection,
        password: String,
        user_id: UserId,
    ) -> Result<Self, AppError> {
        let pword = hash_password(password, None);
        let password = Password {
            id: PasswordId(Uuid::new_v4()),
            hash: pword.hash,
            salt: pword.salt,
            user_id,
        };

        query!(
            r#"
            INSERT INTO passwords (id, hash, salt, user_id)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            password.id,
            password.hash,
            password.salt,
            password.user_id
        )
        .execute(conn)
        .await?;

        Ok(password)
    }

    pub(crate) async fn get_by_user_id(
        conn: &mut SqliteConnection,
        user_id: UserId,
    ) -> Result<Self, AppError> {
        query_as!(
            Password,
            r#"
            SELECT
              id AS "id!: Uuid",
              hash,
              salt,
              user_id AS "user_id!: Uuid"
            FROM passwords
            WHERE user_id = ?1
            "#,
            user_id
        )
        .fetch_one(conn)
        .await
        .map_err(|_| AppError::NoPassword)
    }
}

impl Session {
    pub(crate) async fn create(
        conn: &mut SqliteConnection,
        user_id: UserId,
    ) -> Result<Self, AppError> {
        let session = Self {
            id: SessionId(Uuid::new_v4()),
            data: json!("{}"),
            user_id,
            expires: get_timestamp(604800),
        };

        log::debug!("creating session {:?}", session);

        query!(
            r#"
            INSERT INTO sessions (id, data, user_id, expires)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            session.id,
            session.data,
            session.user_id,
            session.expires
        )
        .execute(conn)
        .await?;

        Ok(session)
    }

    pub(crate) async fn get(
        conn: &mut SqliteConnection,
        session_id: SessionId,
    ) -> Result<Self, AppError> {
        query_as!(
            Self,
            r#"
            SELECT
              id AS "id!: Uuid",
              data AS "data: serde_json::Value",
              expires AS "expires!: OffsetDateTime",
              user_id AS "user_id!: Uuid"
            FROM sessions
            WHERE id = ?1
            "#,
            session_id
        )
        .fetch_one(conn)
        .await
        .map_err(|_| AppError::SessionNotFound)
    }
}

impl Feed {
    pub(crate) async fn create(
        conn: &mut SqliteConnection,
        url: Url,
        title: String,
        kind: FeedKind,
    ) -> Result<Self, AppError> {
        let feed = Self {
            id: FeedId(Uuid::new_v4()),
            url: url.to_string(),
            title,
            kind,
            disabled: false,
            icon: None,
            html_url: None,
        };

        query!(
            r#"
            INSERT INTO feeds (id, url, title, kind, disabled)
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
            feed.id,
            feed.url,
            feed.title,
            feed.kind,
            feed.disabled,
        )
        .execute(conn)
        .await
        .map_err(|err| {
            log::warn!("Error inserting feed: {}", err);
            err
        })?;

        Ok(feed)
    }

    pub(crate) async fn delete(
        conn: &mut SqliteConnection,
        id: Uuid,
    ) -> Result<(), AppError> {
        query!("DELETE FROM feeds WHERE id = ?1", id)
            .execute(conn)
            .await?;
        Ok(())
    }

    pub(crate) async fn get(
        conn: &mut SqliteConnection,
        id: FeedId,
    ) -> Result<Feed, AppError> {
        Ok(query_as!(
            Feed,
            r#"
            SELECT
              id AS "id!: Uuid",
              url,
              title,
              kind,
              disabled AS "disabled!: bool",
              icon,
              html_url
            FROM feeds
            WHERE id = ?1
            "#,
            id
        )
        .fetch_one(conn)
        .await
        .map_err(|err| {
            log::warn!("error getting feed {}: {}", id, err);
            err
        })?)
    }

    pub(crate) async fn get_all(
        conn: &mut SqliteConnection,
    ) -> Result<Vec<Self>, AppError> {
        Ok(query_as!(
            Feed,
            r#"
            SELECT
              id AS "id!: Uuid",
              url,
              title,
              kind,
              disabled AS "disabled!: bool",
              icon,
              html_url
            FROM feeds
            "#
        )
        .fetch_all(conn)
        .await
        .map_err(|err| {
            log::warn!("error loading feeds: {}", err);
            err
        })?)
    }

    pub(crate) async fn get_for_group(
        conn: &mut SqliteConnection,
        group_id: FeedGroupId,
    ) -> Result<Vec<Feed>, AppError> {
        Ok(query_as!(
            Feed,
            r#"
            SELECT
              feeds.id AS "id!: Uuid",
              url,
              title,
              kind,
              disabled AS "disabled!: bool",
              icon,
              html_url
            FROM feeds
            INNER JOIN feed_group_feeds ON feeds.id = feed_group_feeds.feed_id
            WHERE feed_group_feeds.feed_group_id = ?1
            "#,
            group_id
        )
        .fetch_all(conn)
        .await
        .map_err(|err| {
            log::warn!("error getting feed for group {}: {}", group_id, err);
            err
        })?)
    }


    pub(crate) async fn refresh(
        self,
        conn: &mut SqliteConnection,
    ) -> Result<(), AppError> {
        let channel = load_feed(self.url.clone()).await;
        if let Err(err) = channel {
            log::warn!("error downloading feed {}: {}", self.url, err);
            FeedLog::create(conn, self.id, false, Some(err.to_string()))
                .await
                .err()
                .map(|err| {
                    log::debug!("error creating feed update: {}", err);
                });
            return Err(err);
        }

        let channel = channel.unwrap();
        log::debug!("downloaded feed at {}", self.url);

        let mut errors: Vec<String> = vec![];

        let icon = get_icon(&channel).await;
        if let Ok(Some(icon)) = icon {
            let icon_str = icon.to_string();
            query!(
                "UPDATE feeds SET icon = ?1 WHERE id = ?2",
                icon_str,
                self.id,
            )
            .execute(&mut *conn)
            .await
            .err()
            .map(|err| {
                errors.push(format!("error updating icon: {}", err));
            });
        } else if let Err(err) = icon {
            log::warn!("error getting icon for {}: {}", self.url, err);
            errors.push(format!("error getting icon: {}", err));
        }

        for item in &channel.items {
            let item_content = get_content(&item)?;
            if let Some(content) = item_content.content {
                Article::create(
                    &mut *conn,
                    ArticleNew {
                        content,
                        feed_id: self.id.clone(),
                        article_id: item_content.article_id.clone(),
                        title: item_content.title,
                        link: item_content.link,
                        published: item_content.published,
                    },
                )
                .await
                .err()
                .map(|err| {
                    errors.push(format!("error creating article: {}", err));
                });
            }
        }

        log::debug!("added articles");

        FeedLog::create(conn, self.id, true, Some(errors.join("\n")))
            .await
            .err()
            .map(|err| {
                log::debug!("error creating feed update: {}", err);
            });

        Ok(())
    }

    pub(crate) async fn refresh_all(
        conn: &mut SqliteConnection,
    ) -> Result<(), AppError> {
        let feeds = Feed::get_all(conn).await?;
        for feed in feeds {
            let id = feed.id;
            feed.refresh(conn).await.unwrap_or_else(|err| {
                log::warn!("error refreshing feed {}: {}", id, err);
            })
        }

        Ok(())
    }
}

#[derive(Debug)]
pub(crate) struct ArticleNew {
    pub(crate) content: String,
    pub(crate) feed_id: FeedId,
    pub(crate) article_id: String,
    pub(crate) title: String,
    pub(crate) link: Option<Url>,
    pub(crate) published: OffsetDateTime,
}

impl Article {
    pub(crate) async fn create(
        conn: &mut SqliteConnection,
        data: ArticleNew,
    ) -> Result<Self, AppError> {
        let article = Self {
            id: ArticleId(Uuid::new_v4()),
            content: data.content.clone(),
            feed_id: data.feed_id,
            article_id: data.article_id.clone(),
            title: data.title.clone(),
            link: data.link.map(|l| l.into()),
            published: data.published,
        };

        query!(
            r#"
            INSERT INTO articles(
              content, id, feed_id, article_id, title, link, published
            )
            VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(article_id, feed_id)
            DO UPDATE
            SET content = ?1, published = ?7, title = ?5, link = ?6
            "#,
            article.content,
            article.id,
            article.feed_id,
            article.article_id,
            article.title,
            article.link,
            article.published
        )
        .execute(&mut *conn)
        .await?;

        Ok(article)
    }

    pub(crate) async fn get_all(
        conn: &mut SqliteConnection,
    ) -> Result<Vec<Self>, AppError> {
        Ok(query_as!(
            Article,
            r#"
            SELECT
              id AS "id!: Uuid",
              article_id,
              feed_id AS "feed_id!: Uuid",
              title,
              content,
              published AS "published: OffsetDateTime",
              link
            FROM articles
            "#
        )
        .fetch_all(conn)
        .await?)
    }

    pub(crate) async fn find_all_for_feed(
        conn: &mut SqliteConnection,
        feed_id: Uuid,
    ) -> Result<Vec<Self>, AppError> {
        Ok(query_as!(
            Article,
            r#"
            SELECT
              id AS "id!: Uuid",
              article_id,
              feed_id AS "feed_id!: Uuid",
              title,
              content,
              published AS "published: OffsetDateTime",
              link
            FROM articles
            WHERE feed_id = ?1
            "#,
            feed_id
        )
        .fetch_all(conn)
        .await?)
    }
}

impl FeedLog {
    pub(crate) async fn create(
        conn: &mut SqliteConnection,
        feed_id: FeedId,
        success: bool,
        message: Option<String>,
    ) -> Result<Self, AppError> {
        let update = FeedLog {
            id: FeedLogId(Uuid::new_v4()),
            time: get_timestamp(0),
            feed_id,
            success,
            message,
        };

        query!(
            r#"
            INSERT INTO feed_logs(id, time, feed_id, success, message)
            VALUES(?1, ?2, ?3, ?4, ?5)
            "#,
            update.id,
            update.time,
            update.feed_id,
            update.success,
            update.message,
        )
        .execute(&mut *conn)
        .await?;

        Ok(update)
    }

    pub(crate) async fn find_for_feed(
        conn: &mut SqliteConnection,
        feed_id: FeedId,
    ) -> Result<Vec<Self>, AppError> {
        query_as!(
            FeedLog,
            r#"
            SELECT
              id AS "id!: Uuid",
              time AS "time!: OffsetDateTime",
              feed_id AS "feed_id!: Uuid",
              success AS "success!: bool",
              message
            FROM feed_logs
            WHERE feed_id = ?1
            "#,
            feed_id
        )
        .fetch_all(conn)
        .await
        .map_err(AppError::SqlxError)
    }

    pub(crate) async fn get_all(
        conn: &mut SqliteConnection,
    ) -> Result<Vec<Self>, AppError> {
        query_as!(
            FeedLog,
            r#"
            SELECT
              id AS "id!: Uuid",
              time AS "time!: OffsetDateTime",
              feed_id AS "feed_id!: Uuid",
              success AS "success!: bool",
              message
            FROM feed_logs
            "#,
        )
        .fetch_all(conn)
        .await
        .map_err(AppError::SqlxError)
    }
}

impl FeedGroup {
    pub(crate) async fn create(
        conn: &mut SqliteConnection,
        name: String,
        user_id: UserId,
    ) -> Result<Self, AppError> {
        let group = FeedGroup {
            id: FeedGroupId(Uuid::new_v4()),
            name,
            user_id,
        };

        query!(
            r#"
            INSERT INTO feed_groups(id, name, user_id)
            VALUES(?1, ?2, ?3)
            "#,
            group.id,
            group.name,
            group.user_id,
        )
        .execute(&mut *conn)
        .await?;

        Ok(group)
    }

    pub(crate) async fn get(
        conn: &mut SqliteConnection,
        feed_group_id: FeedGroupId,
    ) -> Result<Self, AppError> {
        query_as!(
            Self,
            r#"
            SELECT
              id AS "id!: Uuid",
              name,
              user_id AS "user_id!: Uuid"
            FROM feed_groups
            WHERE id = ?1
            "#,
            feed_group_id
        )
        .fetch_one(conn)
        .await
        .map_err(|_| AppError::SessionNotFound)
    }

    pub(crate) async fn get_all(
        conn: &mut SqliteConnection,
    ) -> Result<Vec<Self>, AppError> {
        query_as!(
            FeedGroup,
            r#"
            SELECT
              id AS "id!: Uuid",
              name,
              user_id AS "user_id!: Uuid"
            FROM feed_groups
            "#
        )
        .fetch_all(conn)
        .await
        .map_err(AppError::SqlxError)
    }

    pub(crate) async fn add_feed(
        &self,
        conn: &mut SqliteConnection,
        feed_id: FeedId,
    ) -> Result<FeedGroupFeed, AppError> {
        let group_feed = FeedGroupFeed {
            id: FeedGroupFeedId(Uuid::new_v4()),
            feed_id,
            feed_group_id: self.id,
        };

        query!(
            r#"
            INSERT INTO feed_group_feeds(id, feed_id, feed_group_id)
            VALUES(?1, ?2, ?3)
            "#,
            group_feed.id,
            group_feed.feed_id,
            group_feed.feed_group_id,
        )
        .execute(&mut *conn)
        .await?;

        Ok(group_feed)
    }

    pub(crate) async fn remove_feed(
        &self,
        conn: &mut SqliteConnection,
        feed_id: FeedId,
    ) -> Result<(), AppError> {
        query!(
            r#"
            DELETE FROM feed_group_feeds
            WHERE feed_group_id = ?1 AND feed_id = ?2
            "#,
            self.id,
            feed_id,
        )
        .execute(&mut *conn)
        .await?;

        Ok(())
    }
}
