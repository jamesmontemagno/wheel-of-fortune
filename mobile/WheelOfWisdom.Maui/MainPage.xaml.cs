using System.Diagnostics;
using System.Text.Json;

namespace WheelOfWisdom.Maui;

public partial class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();
    }

    private void OnHybridWebViewRawMessageReceived(object? sender, HybridWebViewRawMessageReceivedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(e.Message)) return;

        try
        {
            using var payload = JsonDocument.Parse(e.Message);
            if (payload.RootElement.ValueKind != JsonValueKind.Object) return;

            if (payload.RootElement.TryGetProperty("type", out var typeElement) &&
                typeElement.GetString() == "save" &&
                payload.RootElement.TryGetProperty("values", out var valuesElement) &&
                valuesElement.ValueKind == JsonValueKind.Object)
            {
                AppPreferences.SaveValues(valuesElement);
            }
            else if (payload.RootElement.TryGetProperty("type", out var restoreTypeElement) &&
                     restoreTypeElement.GetString() == "requestRestore")
            {
                HybridWebViewControl.SendRawMessage(AppPreferences.RestorePayload());
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Unable to process a HybridWebView message: {ex}");
        }
    }
}
