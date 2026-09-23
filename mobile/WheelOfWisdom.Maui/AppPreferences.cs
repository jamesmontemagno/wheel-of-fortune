using System.Text.Json;

namespace WheelOfWisdom.Maui;

public static class AppPreferences
{
    public const string SoundKey = "wheel-of-wisdom.sound";
    public const string PlayersKey = "wheel-of-wisdom.players";

    public static bool GetSoundPreference(bool defaultValue = false)
        => Preferences.Default.Get(SoundKey, defaultValue);

    public static string GetPlayersPreference(string defaultValue = "{\"count\":2,\"names\":[\"\",\"\",\"\"]}")
        => Preferences.Default.Get(PlayersKey, defaultValue);

    public static void SaveSoundPreference(bool value)
        => Preferences.Default.Set(SoundKey, value);

    public static void SavePlayersPreference(string json)
    {
        if (!TryNormalizePlayers(json, out var normalized))
        {
            throw new JsonException("The player preference payload is invalid.");
        }

        Preferences.Default.Set(PlayersKey, normalized);
    }

    public static void SaveValues(JsonElement values)
    {
        if (values.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException("Preference values must be a JSON object.");
        }

        if (values.TryGetProperty(SoundKey, out var sound))
        {
            SaveSoundPreference(sound.GetBoolean());
        }

        if (values.TryGetProperty(PlayersKey, out var players))
        {
            SavePlayersPreference(players.GetString() ?? string.Empty);
        }
    }

    public static string RestorePayload(IReadOnlyList<GameHistoryEntry> history)
    {
        var values = new Dictionary<string, object?>
        {
            [SoundKey] = GetSoundPreference(),
            [PlayersKey] = GetPlayersPreference(),
        };

        return JsonSerializer.Serialize(new { type = "restore", values, history });
    }

    private static bool TryNormalizePlayers(string json, out string normalized)
    {
        normalized = string.Empty;

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (!root.TryGetProperty("count", out var countElement) ||
                !countElement.TryGetInt32(out var count) ||
                count is not (2 or 3) ||
                !root.TryGetProperty("names", out var namesElement) ||
                namesElement.ValueKind != JsonValueKind.Array ||
                namesElement.GetArrayLength() != 3)
            {
                return false;
            }

            var names = namesElement.EnumerateArray()
                .Select(name => name.ValueKind == JsonValueKind.String ? name.GetString() : null)
                .ToArray();

            if (names.Any(name => name is null || name.Length > 24))
            {
                return false;
            }

            normalized = JsonSerializer.Serialize(new { count, names });
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
