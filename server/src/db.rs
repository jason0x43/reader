use crate::{
    error::AppError,
    types::{Feed, FeedKind, Password, Session, User},
    util::{get_future_time, hash_password},
};
use serde_json::json;
use sqlx::{query, query_as, Executor, Sqlite};
use url::Url;
use uuid::Uuid;

impl User {
    pub(crate) async fn create<'c, E>(
        exec: E,
        email: String,
        username: String,
    ) -> Result<Self, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        let user = Self {
            id: Uuid::new_v4(),
            email,
            username,
            config: None,
        };

        query!(
            r#"
            INSERT INTO users (id, email, username)
            VALUES (?1, ?2, ?3)
            "#,
            user.id,
            user.email,
            user.username
        )
        .execute(exec)
        .await?;

        Ok(user)
    }

    pub(crate) async fn get_by_username<'c, E>(
        exec: E,
        username: String,
    ) -> Result<Self, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        let user = query_as!(
            Self,
            r#"
            SELECT id AS "id!: Uuid", email, username,
            config as "config: serde_json::Value"
            FROM users
            WHERE username = ?1
            "#,
            username
        )
        .fetch_one(exec)
        .await
        .map_err(|_| AppError::UserNotFound)?;

        Ok(user)
    }

    pub(crate) async fn find_all<'c, E>(exec: E) -> Result<Vec<Self>, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        let users = query_as!(
            Self,
            r#"
            SELECT id AS "id!: Uuid", email, username,
            config AS "config: serde_json::Value"
            FROM users
            "#
        )
        .fetch_all(exec)
        .await?;

        Ok(users)
    }
}

impl Password {
    pub(crate) async fn create<'c, E>(
        exec: E,
        password: String,
        user_id: Uuid,
    ) -> Result<Self, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        let pword = hash_password(password, None);
        let password = Password {
            id: Uuid::new_v4(),
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
        .execute(exec)
        .await?;

        Ok(password)
    }

    pub(crate) async fn get_by_user_id<'c, E>(
        exec: E,
        user_id: Uuid,
    ) -> Result<Self, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        let password = query_as!(
            Self,
            r#"
            SELECT id AS "id!: Uuid", hash, salt, user_id AS "user_id!: Uuid"
            FROM passwords
            WHERE user_id = ?1
            "#,
            user_id
        )
        .fetch_one(exec)
        .await
        .map_err(|_| AppError::NoPassword)?;

        Ok(password)
    }
}

impl Session {
    pub(crate) async fn create<'c, E>(
        exec: E,
        user_id: Uuid,
    ) -> Result<Self, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        let session = Self {
            id: Uuid::new_v4(),
            data: json!("{}"),
            user_id,
            expires: get_future_time(604800),
        };

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
        .execute(exec)
        .await?;

        Ok(session)
    }

    pub(crate) async fn get<'c, E>(
        exec: E,
        session_id: Uuid,
    ) -> Result<Self, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        query_as!(
            Session,
            r#"
            SELECT id as "id: Uuid", data, expires, user_id as "user_id: Uuid"
            FROM sessions WHERE id = ?1
            "#,
            session_id
        )
        .fetch_one(exec)
        .await
        .map_err(|_| AppError::SessionNotFound)
    }
}

impl Feed {
    pub(crate) async fn create<'c, E>(
        exec: E,
        url: Url,
        title: String,
        kind: FeedKind,
    ) -> Result<Self, AppError>
    where
        E: Executor<'c, Database = Sqlite>,
    {
        let feed = Self {
            id: Uuid::new_v4(),
            url,
            title,
            kind,
            last_updated: get_future_time(0),
            disabled: false,
            icon: None,
            html_url: None,
        };

        let feed_url = feed.url.to_string();
        let feed_kind = feed.kind.to_string();

        query!(
            r#"
            INSERT INTO feeds (id, url, title, kind)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            feed.id,
            feed_url,
            feed.title,
            feed_kind,
        )
        .execute(exec)
        .await?;

        Ok(feed)
    }
}
