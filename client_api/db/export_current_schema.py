"""Export the current Supabase app schema as a reviewable baseline.

This script is intentionally schema-only. It reads catalog metadata from the
current database connection and writes local artifacts for migration review.
It does not copy data and it does not mutate the source database.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import psycopg
from psycopg.rows import dict_row

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - fallback for minimal environments
    load_dotenv = None


TARGET_SCHEMAS = ("public", "internal_staging")
CRITICAL_RELATIONS = (
    ("public", "job_applications"),
    ("public", "user_account"),
    ("internal_staging", "email_staging"),
)


@dataclass(frozen=True)
class ExportPaths:
    schema_sql: Path
    migration_sql: Path
    schema_map_md: Path
    audit_json: Path


def qident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def qname(schema: str, name: str) -> str:
    return f"{qident(schema)}.{qident(name)}"


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def fetch_all(conn: psycopg.Connection, query: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(query, tuple(params))
        return list(cur.fetchall())


def load_database_url() -> str:
    if load_dotenv:
        load_dotenv()
    url = os.getenv("CLIENT_DATABASE_URL")
    if not url:
        raise RuntimeError("CLIENT_DATABASE_URL is not set")
    return url


def get_columns(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select
            n.nspname as schema_name,
            c.relname as table_name,
            a.attnum,
            a.attname as column_name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
            a.attnotnull as not_null,
            pg_get_expr(ad.adbin, ad.adrelid) as default_expr,
            case
                when a.attidentity = 'a' then 'always'
                when a.attidentity = 'd' then 'by default'
                else null
            end as identity_kind,
            col_description(a.attrelid, a.attnum) as comment
        from pg_attribute a
        join pg_class c on c.oid = a.attrelid
        join pg_namespace n on n.oid = c.relnamespace
        left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
        where n.nspname = any(%s)
          and c.relkind in ('r', 'p')
          and a.attnum > 0
          and not a.attisdropped
        order by n.nspname, c.relname, a.attnum;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_tables(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select
            n.nspname as schema_name,
            c.relname as table_name,
            c.relkind,
            c.relrowsecurity as rls_enabled,
            c.relforcerowsecurity as rls_forced,
            obj_description(c.oid, 'pg_class') as comment
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any(%s)
          and c.relkind in ('r', 'p')
        order by n.nspname, c.relname;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_constraints(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select
            n.nspname as schema_name,
            c.relname as table_name,
            con.conname as constraint_name,
            con.contype,
            pg_get_constraintdef(con.oid, true) as definition
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any(%s)
        order by n.nspname, c.relname, con.contype desc, con.conname;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_sequences(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select
            sequence_schema as schema_name,
            sequence_name,
            data_type,
            start_value,
            minimum_value,
            maximum_value,
            increment
        from information_schema.sequences
        where sequence_schema = any(%s)
        order by sequence_schema, sequence_name;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_indexes(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select schemaname as schema_name, tablename as table_name, indexname, indexdef
        from pg_indexes
        where schemaname = any(%s)
        order by schemaname, tablename, indexname;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_functions(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as identity_args,
            pg_get_functiondef(p.oid) as definition
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = any(%s)
        order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid);
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_triggers(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select
            n.nspname as schema_name,
            c.relname as table_name,
            t.tgname as trigger_name,
            pg_get_triggerdef(t.oid, true) as definition
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any(%s)
          and not t.tgisinternal
        order by n.nspname, c.relname, t.tgname;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_rules(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select schemaname as schema_name, tablename as table_name, rulename, definition
        from pg_rules
        where schemaname = any(%s)
          and rulename <> '_RETURN'
        order by schemaname, tablename, rulename;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_policies(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select schemaname as schema_name, tablename as table_name, policyname,
               permissive, roles, cmd, qual, with_check
        from pg_policies
        where schemaname = any(%s)
        order by schemaname, tablename, policyname;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_table_grants(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select table_schema as schema_name, table_name, grantee, privilege_type
        from information_schema.table_privileges
        where table_schema = any(%s)
          and grantee in ('anon', 'authenticated', 'service_role', 'postgres')
        order by table_schema, table_name, grantee, privilege_type;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_schema_grants(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select
            n.nspname as schema_name,
            r.rolname as grantee,
            p.privilege_type
        from pg_namespace n
        cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) p
        join pg_roles r on r.oid = p.grantee
        where n.nspname = any(%s)
          and r.rolname in ('anon', 'authenticated', 'service_role', 'postgres')
        order by n.nspname, r.rolname, p.privilege_type;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_function_grants(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select routine_schema as schema_name, routine_name, grantee, privilege_type
        from information_schema.routine_privileges
        where routine_schema = any(%s)
          and grantee in ('anon', 'authenticated', 'service_role', 'postgres')
        order by routine_schema, routine_name, grantee, privilege_type;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_publications(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select pubname, schemaname as schema_name, tablename as table_name
        from pg_publication_tables
        where schemaname = any(%s)
        order by pubname, schemaname, tablename;
        """,
        (list(TARGET_SCHEMAS),),
    )


def get_extensions(conn: psycopg.Connection) -> list[dict[str, Any]]:
    return fetch_all(
        conn,
        """
        select e.extname, n.nspname as schema_name, e.extversion
        from pg_extension e
        join pg_namespace n on n.oid = e.extnamespace
        order by e.extname;
        """,
    )


def build_create_table(table: dict[str, Any], columns: list[dict[str, Any]]) -> str:
    lines = []
    for col in columns:
        col_sql = f"    {qident(col['column_name'])} {col['data_type']}"
        if col["identity_kind"]:
            col_sql += f" generated {col['identity_kind']} as identity"
        elif col["default_expr"]:
            col_sql += f" default {col['default_expr']}"
        if col["not_null"]:
            col_sql += " not null"
        lines.append(col_sql)

    return f"create table if not exists {qname(table['schema_name'], table['table_name'])} (\n" + ",\n".join(lines) + "\n);"


def build_policy(policy: dict[str, Any]) -> str:
    roles = ", ".join(policy["roles"]) if policy["roles"] else "public"
    sql = (
        f"create policy {qident(policy['policyname'])}\n"
        f"on {qname(policy['schema_name'], policy['table_name'])}\n"
        f"as {policy['permissive'].lower()}\n"
        f"for {policy['cmd'].lower()}\n"
        f"to {roles}"
    )
    if policy["qual"]:
        sql += f"\nusing ({policy['qual']})"
    if policy["with_check"]:
        sql += f"\nwith check ({policy['with_check']})"
    return sql + ";"


def render_schema_sql(snapshot: dict[str, Any]) -> str:
    now = snapshot["generated_at"]
    output = [
        "-- JAICE current Supabase schema baseline",
        f"-- Generated at: {now}",
        "-- Scope: schema-only; no table data is included.",
        "-- Source schemas: public, internal_staging",
        "",
        "create schema if not exists public;",
        "create schema if not exists internal_staging;",
        "",
        "-- Extensions observed on source. Review before applying to a new Supabase project.",
    ]

    for ext in snapshot["extensions"]:
        output.append(f"-- extension: {ext['extname']} schema={ext['schema_name']} version={ext['extversion']}")

    output.extend(["", "-- Sequences"])
    for seq in snapshot["sequences"]:
        output.append(
            f"create sequence if not exists {qname(seq['schema_name'], seq['sequence_name'])} "
            f"as {seq['data_type']} "
            f"increment by {seq['increment']} "
            f"minvalue {seq['minimum_value']} "
            f"maxvalue {seq['maximum_value']} "
            f"start with {seq['start_value']};"
        )

    output.extend(["", "-- Tables"])
    columns_by_table: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for column in snapshot["columns"]:
        columns_by_table.setdefault((column["schema_name"], column["table_name"]), []).append(column)

    for table in snapshot["tables"]:
        output.append(build_create_table(table, columns_by_table[(table["schema_name"], table["table_name"])]))
        if table["comment"]:
            output.append(
                f"comment on table {qname(table['schema_name'], table['table_name'])} is {sql_literal(table['comment'])};"
            )
        output.append("")

    output.append("-- Constraints")
    for con in snapshot["constraints"]:
        output.append(
            f"alter table only {qname(con['schema_name'], con['table_name'])} "
            f"add constraint {qident(con['constraint_name'])} {con['definition']};"
        )
    output.append("")

    output.append("-- Indexes")
    constraint_index_names = {c["constraint_name"] for c in snapshot["constraints"]}
    for idx in snapshot["indexes"]:
        if idx["indexname"] in constraint_index_names:
            continue
        output.append(idx["indexdef"] + ";")
    output.append("")

    output.append("-- Rules")
    for rule in snapshot["rules"]:
        output.append(rule["definition"].rstrip() + ";")
    output.append("")

    output.append("-- Functions")
    for fn in snapshot["functions"]:
        output.append(fn["definition"].rstrip() + ";")
        output.append("")

    output.append("-- Triggers")
    for trg in snapshot["triggers"]:
        output.append(trg["definition"] + ";")
    output.append("")

    output.append("-- Row-level security")
    for table in snapshot["tables"]:
        relation = qname(table["schema_name"], table["table_name"])
        if table["rls_enabled"]:
            output.append(f"alter table {relation} enable row level security;")
        if table["rls_forced"]:
            output.append(f"alter table {relation} force row level security;")
    for policy in snapshot["policies"]:
        output.append(build_policy(policy))
    output.append("")

    output.append("-- Grants observed for standard Supabase roles")
    schema_grant_groups: dict[tuple[str, str], list[str]] = {}
    for grant in snapshot["schema_grants"]:
        schema_grant_groups.setdefault((grant["schema_name"], grant["grantee"]), []).append(
            grant["privilege_type"]
        )
    for (schema, grantee), privileges in schema_grant_groups.items():
        output.append(
            f"grant {', '.join(sorted(privileges))} on schema {qident(schema)} to {qident(grantee)};"
        )

    grant_groups: dict[tuple[str, str, str], list[str]] = {}
    for grant in snapshot["table_grants"]:
        grant_groups.setdefault(
            (grant["schema_name"], grant["table_name"], grant["grantee"]), []
        ).append(grant["privilege_type"])
    for (schema, table, grantee), privileges in grant_groups.items():
        output.append(
            f"grant {', '.join(sorted(privileges))} on table {qname(schema, table)} to {qident(grantee)};"
        )

    function_grant_groups: dict[tuple[str, str, str], list[str]] = {}
    for grant in snapshot["function_grants"]:
        function_grant_groups.setdefault(
            (grant["schema_name"], grant["routine_name"], grant["grantee"]), []
        ).append(grant["privilege_type"])
    for (schema, routine, grantee), privileges in function_grant_groups.items():
        output.append(
            f"-- routine grant observed: {', '.join(sorted(privileges))} on {qname(schema, routine)} to {qident(grantee)}"
        )
    output.append("")

    output.append("-- Realtime/publication audit")
    if snapshot["publications"]:
        for pub in snapshot["publications"]:
            output.append(
                f"-- publication {pub['pubname']} includes {qname(pub['schema_name'], pub['table_name'])}"
            )
    else:
        output.append("-- no app-owned tables found in pg_publication_tables")
    output.append("")

    return "\n".join(output)


def render_map_md(snapshot: dict[str, Any]) -> str:
    lines = [
        "# Current Supabase Schema Discovery",
        "",
        f"- Generated at: `{snapshot['generated_at']}`",
        "- Source: current `CLIENT_DATABASE_URL` from `.env`",
        "- Scope: schema only; no table data copied",
        "- Schemas: `public`, `internal_staging`",
        "",
        "## Critical Surface Check",
    ]

    existing = {(t["schema_name"], t["table_name"]) for t in snapshot["tables"]}
    for schema, table in CRITICAL_RELATIONS:
        mark = "present" if (schema, table) in existing else "missing"
        lines.append(f"- `{schema}.{table}`: {mark}")

    lines.extend(["", "## Tables"])
    column_counts: dict[tuple[str, str], int] = {}
    for col in snapshot["columns"]:
        column_counts[(col["schema_name"], col["table_name"])] = column_counts.get(
            (col["schema_name"], col["table_name"]), 0
        ) + 1
    for table in snapshot["tables"]:
        lines.append(
            f"- `{table['schema_name']}.{table['table_name']}`: "
            f"{column_counts[(table['schema_name'], table['table_name'])]} columns, "
            f"RLS={'on' if table['rls_enabled'] else 'off'}"
        )

    lines.extend(["", "## Functions"])
    if snapshot["functions"]:
        for fn in snapshot["functions"]:
            lines.append(f"- `{fn['schema_name']}.{fn['function_name']}({fn['identity_args']})`")
    else:
        lines.append("- None found in app-owned schemas.")

    lines.extend(["", "## Triggers"])
    if snapshot["triggers"]:
        for trg in snapshot["triggers"]:
            lines.append(f"- `{trg['schema_name']}.{trg['table_name']}` -> `{trg['trigger_name']}`")
    else:
        lines.append("- None found on app-owned tables.")

    lines.extend(["", "## RLS Policies"])
    if snapshot["policies"]:
        for policy in snapshot["policies"]:
            lines.append(
                f"- `{policy['schema_name']}.{policy['table_name']}` -> "
                f"`{policy['policyname']}` ({policy['cmd']})"
            )
    else:
        lines.append("- None found on app-owned tables.")

    lines.extend(["", "## Realtime/Publications"])
    if snapshot["publications"]:
        for pub in snapshot["publications"]:
            lines.append(f"- `{pub['pubname']}` includes `{pub['schema_name']}.{pub['table_name']}`")
    else:
        lines.append("- No app-owned tables found in `pg_publication_tables`.")

    lines.extend(["", "## Review Notes"])
    lines.append("- Review the generated SQL before using it against a new Supabase project.")
    lines.append("- Supabase-managed schemas such as `auth`, `storage`, and extension schemas are intentionally not cloned.")
    lines.append("- Realtime internals are audited but not wholesale cloned.")
    typo_functions = [
        fn for fn in snapshot["functions"] if "internal_staing" in fn["definition"]
    ]
    if typo_functions:
        lines.extend(["", "## Migration Review Warnings"])
        for fn in typo_functions:
            lines.append(
                f"- `{fn['schema_name']}.{fn['function_name']}` references `internal_staing`; verify whether this source typo must be corrected before rebuild."
            )
    lines.append("")
    return "\n".join(lines)


def collect_snapshot(conn: psycopg.Connection) -> dict[str, Any]:
    snapshot = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "schemas": list(TARGET_SCHEMAS),
        "tables": get_tables(conn),
        "columns": get_columns(conn),
        "sequences": get_sequences(conn),
        "constraints": get_constraints(conn),
        "indexes": get_indexes(conn),
        "functions": get_functions(conn),
        "triggers": get_triggers(conn),
        "rules": get_rules(conn),
        "policies": get_policies(conn),
        "schema_grants": get_schema_grants(conn),
        "table_grants": get_table_grants(conn),
        "function_grants": get_function_grants(conn),
        "publications": get_publications(conn),
        "extensions": get_extensions(conn),
    }
    return snapshot


def export(paths: ExportPaths) -> None:
    url = load_database_url()
    with psycopg.connect(url, connect_timeout=15) as conn:
        conn.execute("set default_transaction_read_only = on")
        snapshot = collect_snapshot(conn)

    paths.schema_sql.parent.mkdir(parents=True, exist_ok=True)
    paths.migration_sql.parent.mkdir(parents=True, exist_ok=True)

    schema_sql = render_schema_sql(snapshot)
    paths.schema_sql.write_text(schema_sql, encoding="utf-8", newline="\n")
    paths.migration_sql.write_text(schema_sql, encoding="utf-8", newline="\n")
    paths.schema_map_md.write_text(render_map_md(snapshot), encoding="utf-8", newline="\n")
    paths.audit_json.write_text(json.dumps(snapshot, indent=2, default=str), encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema-sql", default="client_api/db/schema/current_schema_snapshot.sql")
    parser.add_argument("--migration-sql", default="supabase/migrations/20260523_baseline_schema.sql")
    parser.add_argument("--schema-map", default="client_api/db/schema/current_schema_map.md")
    parser.add_argument("--audit-json", default="client_api/db/schema/current_schema_audit.json")
    args = parser.parse_args()

    export(
        ExportPaths(
            schema_sql=Path(args.schema_sql),
            migration_sql=Path(args.migration_sql),
            schema_map_md=Path(args.schema_map),
            audit_json=Path(args.audit_json),
        )
    )


if __name__ == "__main__":
    main()
