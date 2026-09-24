using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using SQLite;

namespace WheelOfWisdom.Maui;

public sealed class GameHistoryDatabase
{
    private const string DatabaseFilename = "wheel-of-wisdom.db3";
    private const long JavaScriptMaxSafeInteger = 9_007_199_254_740_991;
    private static readonly SQLiteOpenFlags Flags =
        SQLiteOpenFlags.ReadWrite |
        SQLiteOpenFlags.Create |
        SQLiteOpenFlags.SharedCache;

    private readonly SemaphoreSlim initializationLock = new(1, 1);
    private SQLiteAsyncConnection? database;

    public async Task<IReadOnlyList<GameHistoryEntry>> LoadAsync()
    {
        var connection = await GetConnectionAsync();
        var rows = await connection.Table<GameHistoryRecord>()
            .OrderByDescending(record => record.FinishedAtUtcTicks)
            .ToListAsync();
        var history = new List<GameHistoryEntry>(rows.Count);

        foreach (var row in rows)
        {
            try
            {
                using var document = JsonDocument.Parse(row.Payload);
                if (TryCreateEntry(document.RootElement, out var entry) && entry.Id == row.Id)
                {
                    history.Add(entry);
                }
            }
            catch (JsonException)
            {
                // Ignore malformed rows instead of preventing valid history from loading.
            }
        }

        return history;
    }

    public async Task SaveAsync(JsonElement payload)
    {
        if (!TryCreateEntry(payload, out var entry))
        {
            throw new JsonException("The game history payload is invalid.");
        }

        var connection = await GetConnectionAsync();
        var finishedAt = DateTimeOffset.Parse(
            entry.FinishedAt,
            CultureInfo.InvariantCulture,
            DateTimeStyles.RoundtripKind);

        await connection.InsertOrReplaceAsync(new GameHistoryRecord
        {
            Id = entry.Id,
            FinishedAtUtcTicks = finishedAt.UtcDateTime.Ticks,
            Payload = JsonSerializer.Serialize(entry),
        });
    }

    private async Task<SQLiteAsyncConnection> GetConnectionAsync()
    {
        if (database is not null)
        {
            return database;
        }

        await initializationLock.WaitAsync();
        try
        {
            if (database is null)
            {
                var path = Path.Combine(FileSystem.AppDataDirectory, DatabaseFilename);
                var connection = new SQLiteAsyncConnection(path, Flags);
                await connection.CreateTableAsync<GameHistoryRecord>();
                await connection.EnableWriteAheadLoggingAsync();
                database = connection;
            }
        }
        finally
        {
            initializationLock.Release();
        }

        return database;
    }

    private static bool TryCreateEntry(JsonElement payload, out GameHistoryEntry entry)
    {
        entry = new GameHistoryEntry();

        if (payload.ValueKind != JsonValueKind.Object ||
            !payload.TryGetProperty("id", out var idElement) ||
            idElement.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(idElement.GetString()) ||
            idElement.GetString()!.Length > 128 ||
            !payload.TryGetProperty("finishedAt", out var finishedAtElement) ||
            finishedAtElement.ValueKind != JsonValueKind.String ||
            !DateTimeOffset.TryParse(
                finishedAtElement.GetString(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out _) ||
            !payload.TryGetProperty("players", out var playersElement) ||
            playersElement.ValueKind != JsonValueKind.Array ||
            playersElement.GetArrayLength() is not (2 or 3) ||
            !payload.TryGetProperty("champion", out var championElement) ||
            !championElement.TryGetInt32(out var champion) ||
            champion < 0 ||
            champion >= playersElement.GetArrayLength() ||
            !payload.TryGetProperty("bonusWon", out var bonusWonElement) ||
            bonusWonElement.ValueKind is not (JsonValueKind.True or JsonValueKind.False) ||
            !payload.TryGetProperty("bonusPrizeLabel", out var bonusPrizeLabelElement) ||
            bonusPrizeLabelElement.ValueKind != JsonValueKind.String ||
            !payload.TryGetProperty("bonusPrize", out var bonusPrizeElement) ||
            !TryGetValidScore(bonusPrizeElement, out var bonusPrize))
        {
            return false;
        }

        var players = new List<GameHistoryPlayer>(playersElement.GetArrayLength());
        foreach (var playerElement in playersElement.EnumerateArray())
        {
            if (playerElement.ValueKind != JsonValueKind.Object ||
                !playerElement.TryGetProperty("name", out var nameElement) ||
                nameElement.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(nameElement.GetString()) ||
                nameElement.GetString()!.Length > 24 ||
                !playerElement.TryGetProperty("total", out var totalElement) ||
                !TryGetValidScore(totalElement, out var total))
            {
                return false;
            }

            players.Add(new GameHistoryPlayer
            {
                Name = nameElement.GetString()!,
                Total = total,
            });
        }

        entry = new GameHistoryEntry
        {
            Id = idElement.GetString()!,
            FinishedAt = finishedAtElement.GetString()!,
            Players = players,
            Champion = champion,
            BonusWon = bonusWonElement.GetBoolean(),
            BonusPrizeLabel = bonusPrizeLabelElement.GetString()!,
            BonusPrize = bonusPrize,
        };
        return true;
    }

    private static bool TryGetValidScore(JsonElement element, out long score)
    {
        return element.TryGetInt64(out score) &&
            score >= 0 &&
            score <= JavaScriptMaxSafeInteger;
    }

    private sealed class GameHistoryRecord
    {
        [PrimaryKey]
        public string Id { get; set; } = string.Empty;

        [Indexed]
        public long FinishedAtUtcTicks { get; set; }

        public string Payload { get; set; } = string.Empty;
    }
}

public sealed class GameHistoryEntry
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("finishedAt")]
    public string FinishedAt { get; set; } = string.Empty;

    [JsonPropertyName("players")]
    public IReadOnlyList<GameHistoryPlayer> Players { get; set; } = [];

    [JsonPropertyName("champion")]
    public int Champion { get; set; }

    [JsonPropertyName("bonusWon")]
    public bool BonusWon { get; set; }

    [JsonPropertyName("bonusPrizeLabel")]
    public string BonusPrizeLabel { get; set; } = string.Empty;

    [JsonPropertyName("bonusPrize")]
    public long BonusPrize { get; set; }
}

public sealed class GameHistoryPlayer
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("total")]
    public long Total { get; set; }
}
