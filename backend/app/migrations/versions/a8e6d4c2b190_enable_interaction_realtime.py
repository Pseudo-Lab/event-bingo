"""enable secure realtime for bingo interactions

Revision ID: a8e6d4c2b190
Revises: f3a4b5c6d7e8
Create Date: 2026-08-18 00:00:00+09:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "a8e6d4c2b190"
down_revision: Union[str, None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.bingo_realtime_identity_backfill_audit (
            migration_revision varchar(32) NOT NULL,
            bingo_user_id integer NOT NULL,
            previous_provider_id varchar(255),
            previous_auth_provider varchar(50) NOT NULL,
            assigned_provider_id varchar(255) NOT NULL,
            migrated_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (migration_revision, bingo_user_id)
        )
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL
                ON TABLE public.bingo_realtime_identity_backfill_audit
                FROM authenticated;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL
                ON TABLE public.bingo_realtime_identity_backfill_audit
                FROM anon;
            END IF;
        END
        $$
        """
    )
    op.execute(
        """
        DO $$
        DECLARE
            expected_count integer := 0;
            updated_count integer := 0;
        BEGIN
            IF to_regclass('auth.users') IS NOT NULL THEN
                IF EXISTS (
                    SELECT 1
                    FROM auth.users AS auth_user
                    WHERE auth_user.email_confirmed_at IS NOT NULL
                    GROUP BY lower(trim(auth_user.email))
                    HAVING count(*) > 1
                ) THEN
                    RAISE EXCEPTION
                        'Realtime identity backfill aborted: auth.users has duplicate normalized emails';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM public.bingo_user AS app_user
                    WHERE NULLIF(trim(app_user.provider_id), '') IS NULL
                      AND NOT EXISTS (
                          SELECT 1
                          FROM auth.users AS auth_user
                          WHERE auth_user.email_confirmed_at IS NOT NULL
                            AND lower(trim(app_user.user_email)) = lower(trim(auth_user.email))
                      )
                ) THEN
                    RAISE EXCEPTION
                        'Realtime identity backfill aborted: an app user has no confirmed auth.users email match';
                END IF;

                SELECT count(*)
                INTO expected_count
                FROM public.bingo_user AS app_user
                JOIN auth.users AS auth_user
                  ON lower(trim(app_user.user_email)) = lower(trim(auth_user.email))
                WHERE NULLIF(trim(app_user.provider_id), '') IS NULL
                  AND auth_user.email_confirmed_at IS NOT NULL;

                INSERT INTO public.bingo_realtime_identity_backfill_audit (
                    migration_revision,
                    bingo_user_id,
                    previous_provider_id,
                    previous_auth_provider,
                    assigned_provider_id
                )
                SELECT
                    'a8e6d4c2b190',
                    app_user.user_id,
                    app_user.provider_id,
                    app_user.auth_provider,
                    auth_user.id::text
                FROM public.bingo_user AS app_user
                JOIN auth.users AS auth_user
                  ON lower(trim(app_user.user_email)) = lower(trim(auth_user.email))
                WHERE NULLIF(trim(app_user.provider_id), '') IS NULL
                  AND auth_user.email_confirmed_at IS NOT NULL
                ON CONFLICT (migration_revision, bingo_user_id) DO NOTHING;

                IF EXISTS (
                    SELECT 1
                    FROM public.bingo_user AS app_user
                    JOIN auth.users AS auth_user
                      ON lower(trim(app_user.user_email)) = lower(trim(auth_user.email))
                    JOIN public.bingo_realtime_identity_backfill_audit AS audit
                      ON audit.migration_revision = 'a8e6d4c2b190'
                     AND audit.bingo_user_id = app_user.user_id
                    WHERE NULLIF(trim(app_user.provider_id), '') IS NULL
                      AND auth_user.email_confirmed_at IS NOT NULL
                      AND audit.assigned_provider_id <> auth_user.id::text
                ) THEN
                    RAISE EXCEPTION
                        'Realtime identity backfill aborted: audited auth identity changed';
                END IF;

                UPDATE public.bingo_user AS app_user
                SET provider_id = audit.assigned_provider_id,
                    auth_provider = 'supabase'
                FROM public.bingo_realtime_identity_backfill_audit AS audit
                WHERE audit.migration_revision = 'a8e6d4c2b190'
                  AND audit.bingo_user_id = app_user.user_id
                  AND NULLIF(trim(app_user.provider_id), '') IS NULL;
                GET DIAGNOSTICS updated_count = ROW_COUNT;

                IF updated_count <> expected_count THEN
                    RAISE EXCEPTION
                        'Realtime identity backfill count mismatch: expected %, updated %',
                        expected_count,
                        updated_count;
                END IF;

                RAISE NOTICE
                    'Realtime identity backfill complete: expected %, updated %',
                    expected_count,
                    updated_count;
            END IF;
        END
        $$
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_bingo_user_provider_id
        ON public.bingo_user (provider_id)
        WHERE provider_id IS NOT NULL
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regprocedure('auth.uid()') IS NULL THEN
                RAISE EXCEPTION
                    'Realtime authorization setup aborted: required Supabase function auth.uid() is missing';
            END IF;
        END
        $$
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.is_current_bingo_user(target_user_id integer)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = ''
        AS $$
            SELECT EXISTS (
                SELECT 1
                FROM public.bingo_user AS app_user
                WHERE app_user.user_id = target_user_id
                  AND app_user.provider_id = (SELECT auth.uid())::text
            )
        $$
        """
    )
    op.execute("REVOKE ALL ON FUNCTION public.is_current_bingo_user(integer) FROM PUBLIC")
    op.execute("ALTER TABLE public.bingo_interaction ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                GRANT SELECT ON TABLE public.bingo_interaction TO authenticated;
                REVOKE INSERT, UPDATE, DELETE ON TABLE public.bingo_interaction FROM authenticated;
                GRANT EXECUTE ON FUNCTION public.is_current_bingo_user(integer) TO authenticated;
                DROP POLICY IF EXISTS bingo_interaction_select_own ON public.bingo_interaction;
                CREATE POLICY bingo_interaction_select_own
                    ON public.bingo_interaction
                    FOR SELECT
                    TO authenticated
                    USING (
                        public.is_current_bingo_user(send_user_id)
                        OR public.is_current_bingo_user(receive_user_id)
                    );
            END IF;

            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON TABLE public.bingo_interaction FROM anon;
            END IF;
        END
        $$
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_publication
                WHERE pubname = 'supabase_realtime'
                  AND NOT puballtables
            ) AND NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = 'bingo_interaction'
            ) THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.bingo_interaction;
            END IF;
        END
        $$
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = 'bingo_interaction'
            ) THEN
                ALTER PUBLICATION supabase_realtime DROP TABLE public.bingo_interaction;
            END IF;
        END
        $$
        """
    )
    op.execute("DROP POLICY IF EXISTS bingo_interaction_select_own ON public.bingo_interaction")
    op.execute("REVOKE ALL ON FUNCTION public.is_current_bingo_user(integer) FROM PUBLIC")
    op.execute("DROP FUNCTION IF EXISTS public.is_current_bingo_user(integer)")
