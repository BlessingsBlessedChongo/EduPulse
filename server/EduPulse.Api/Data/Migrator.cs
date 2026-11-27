using System.Reflection;
using Npgsql;

namespace EduPulse.Api.Data;

/// <summary>
/// Brings the database up to date when the service starts. Each SQL file in
/// Data/Migrations runs once, in name order, inside its own transaction, and is
/// then recorded in schema_history so it never runs again.
/// </summary>
public static class Migrator
{
    public static async Task RunAsync(string connectionString, ILogger logger)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // One service at a time, in case two copies start together.
        await Execute(connection, "SELECT pg_advisory_lock(727301)");
        try
        {
            await Execute(connection,
                "CREATE TABLE IF NOT EXISTS schema_history (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");

            var applied = new HashSet<string>();
            await using (var read = new NpgsqlCommand("SELECT name FROM schema_history", connection))
            await using (var rows = await read.ExecuteReaderAsync())
            {
                while (await rows.ReadAsync()) applied.Add(rows.GetString(0));
            }

            var assembly = Assembly.GetExecutingAssembly();
            var files = assembly.GetManifestResourceNames()
                .Where(name => name.Contains(".Data.Migrations.") && name.EndsWith(".sql"))
                .OrderBy(name => name, StringComparer.Ordinal);

            foreach (var resource in files)
            {
                var name = resource[(resource.IndexOf(".Data.Migrations.", StringComparison.Ordinal) + 17)..];
                if (applied.Contains(name)) continue;

                await using var stream = assembly.GetManifestResourceStream(resource)!;
                using var reader = new StreamReader(stream);
                var sql = await reader.ReadToEndAsync();

                await using var transaction = await connection.BeginTransactionAsync();
                await using (var run = new NpgsqlCommand(sql, connection, transaction)) await run.ExecuteNonQueryAsync();
                await using (var record = new NpgsqlCommand("INSERT INTO schema_history (name) VALUES (@name)", connection, transaction))
                {
                    record.Parameters.AddWithValue("name", name);
                    await record.ExecuteNonQueryAsync();
                }
                await transaction.CommitAsync();
                logger.LogInformation("Applied database change {Name}", name);
            }
        }
        finally
        {
            await Execute(connection, "SELECT pg_advisory_unlock(727301)");
        }
    }

    private static async Task Execute(NpgsqlConnection connection, string sql)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}
