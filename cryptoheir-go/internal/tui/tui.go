package tui

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/network"
	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/types"
)

// Color styles
var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("cyan")).
			Padding(1, 0)

	networkStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("green")).
			Bold(true)

	modeStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("yellow")).
			Bold(true)

	valueStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("yellow"))

	costStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("red")).
			Bold(true)

	labelStyle = lipgloss.NewStyle().
			Bold(true)

	controlsStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("240")).
			Padding(1, 0)

	deploymentStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("magenta")).
			Bold(true)
)

// model represents the TUI state
type model struct {
	txParams *types.TxParams
	viewport viewport.Model
	ready    bool
	approved bool
	quitting bool
}

// ReviewTransaction displays an interactive TUI for transaction review
// Returns true if approved, false if cancelled
func ReviewTransaction(txParams *types.TxParams) (bool, error) {
	m := initialModel(txParams)

	p := tea.NewProgram(m, tea.WithAltScreen())
	finalModel, err := p.Run()
	if err != nil {
		return false, fmt.Errorf("TUI error: %w", err)
	}

	resultModel := finalModel.(model)
	return resultModel.approved, nil
}

func initialModel(txParams *types.TxParams) model {
	return model{
		txParams: txParams,
		viewport: viewport.New(80, 20),
	}
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "y", "Y", "enter":
			// Approve
			m.approved = true
			m.quitting = true
			return m, tea.Quit

		case "n", "N", "q", "Q", "esc":
			// Cancel
			m.approved = false
			m.quitting = true
			return m, tea.Quit

		case "up", "k":
			m.viewport.LineUp(1)
		case "down", "j":
			m.viewport.LineDown(1)
		case "pgup":
			m.viewport.ViewUp()
		case "pgdown":
			m.viewport.ViewDown()
		}

	case tea.WindowSizeMsg:
		if !m.ready {
			m.viewport = viewport.New(msg.Width, msg.Height-6)
			m.viewport.SetContent(m.renderTransaction())
			m.ready = true
		} else {
			m.viewport.Width = msg.Width
			m.viewport.Height = msg.Height - 6
			m.viewport.SetContent(m.renderTransaction())
		}
	}

	var cmd tea.Cmd
	m.viewport, cmd = m.viewport.Update(msg)
	return m, cmd
}

func (m model) View() string {
	if !m.ready {
		return "Loading..."
	}

	// Title
	title := titleStyle.Render("╔══════════════════════════════════════════════╗\n" +
		"║       TRANSACTION REVIEW - SIGN?             ║\n" +
		"╚══════════════════════════════════════════════╝")

	// Viewport with transaction details
	content := m.viewport.View()

	// Controls
	controls := controlsStyle.Render(
		"Controls: [Y/Enter] Approve  [N/Q/Esc] Cancel  [↑↓/j/k] Scroll  [PgUp/PgDn] Fast Scroll",
	)

	return fmt.Sprintf("%s\n\n%s\n\n%s", title, content, controls)
}

func (m model) renderTransaction() string {
	tx := m.txParams.Transaction
	var lines []string

	// Network information
	lines = append(lines, labelStyle.Render("Network: ")+
		networkStyle.Render(fmt.Sprintf("%s (Chain ID: %d)", m.txParams.Metadata.Network.Name, tx.ChainID)))
	lines = append(lines, "")

	// Transaction mode
	modeLabel := string(m.txParams.Mode)
	if m.txParams.Mode == types.TransactionModeDeploy {
		lines = append(lines, labelStyle.Render("Mode: ")+deploymentStyle.Render(strings.ToUpper(modeLabel)))
	} else {
		lines = append(lines, labelStyle.Render("Mode: ")+modeStyle.Render(strings.ToUpper(modeLabel)))
	}

	// Function name (for calls)
	if m.txParams.FunctionName != "" {
		lines = append(lines, labelStyle.Render("Function: ")+m.txParams.FunctionName)
	}
	lines = append(lines, "")

	// Addresses
	lines = append(lines, labelStyle.Render("From: ")+tx.From.Hex())
	if tx.To != nil {
		lines = append(lines, labelStyle.Render("To: ")+tx.To.Hex())
	} else {
		lines = append(lines, labelStyle.Render("To: ")+deploymentStyle.Render("[Contract Deployment]"))
	}
	lines = append(lines, "")

	// Value
	if tx.Value != nil && tx.Value.ToBigInt().Sign() > 0 {
		lines = append(lines, labelStyle.Render("Value: ")+
			valueStyle.Render(network.FormatEth(tx.Value.ToBigInt())))
		lines = append(lines, "")
	}

	// Nonce
	lines = append(lines, labelStyle.Render("Nonce: ")+fmt.Sprintf("%d", tx.Nonce))
	lines = append(lines, "")

	// Gas parameters
	lines = append(lines, labelStyle.Render("Gas Limit: ")+tx.GasLimit.ToBigInt().String())

	if tx.TxType == 2 {
		// EIP-1559
		lines = append(lines, labelStyle.Render("Max Fee Per Gas: ")+
			fmt.Sprintf("%s gwei", weiToGwei(tx.MaxFeePerGas.ToBigInt())))
		lines = append(lines, labelStyle.Render("Max Priority Fee: ")+
			fmt.Sprintf("%s gwei", weiToGwei(tx.MaxPriorityFeePerGas.ToBigInt())))

		// Estimate cost
		maxCost := tx.MaxFeePerGas.ToBigInt()
		maxCost.Mul(maxCost, tx.GasLimit.ToBigInt())
		lines = append(lines, "")
		lines = append(lines, labelStyle.Render("Estimated Max Cost: ")+
			costStyle.Render(network.FormatEth(maxCost)))
	} else {
		// Legacy
		lines = append(lines, labelStyle.Render("Gas Price: ")+
			fmt.Sprintf("%s gwei", weiToGwei(tx.GasPrice.ToBigInt())))

		// Estimate cost
		cost := tx.GasPrice.ToBigInt()
		cost.Mul(cost, tx.GasLimit.ToBigInt())
		lines = append(lines, "")
		lines = append(lines, labelStyle.Render("Estimated Cost: ")+
			costStyle.Render(network.FormatEth(cost)))
	}

	// Function parameters (if available)
	if len(m.txParams.Params) > 0 {
		lines = append(lines, "")
		lines = append(lines, labelStyle.Render("Parameters:"))

		// Pretty print JSON params
		var params map[string]interface{}
		if err := json.Unmarshal(m.txParams.Params, &params); err == nil {
			prettyJSON, err := json.MarshalIndent(params, "", "  ")
			if err == nil {
				lines = append(lines, string(prettyJSON))
			}
		}
	}

	// Data preview (first 32 bytes)
	if len(tx.Data) > 0 {
		lines = append(lines, "")
		lines = append(lines, labelStyle.Render("Data (preview): "))
		preview := tx.Data
		if len(preview) > 64 {
			preview = preview[:64]
		}
		lines = append(lines, fmt.Sprintf("0x%x...", preview))
		lines = append(lines, fmt.Sprintf("(%d bytes total)", len(tx.Data)))
	}

	// Warning message
	lines = append(lines, "")
	lines = append(lines, "")
	lines = append(lines, costStyle.Render("⚠ WARNING: Review all details carefully before signing!"))
	lines = append(lines, costStyle.Render("⚠ This action is irreversible once broadcast."))

	return strings.Join(lines, "\n")
}

// weiToGwei converts wei to gwei for display
func weiToGwei(wei interface{}) string {
	// Convert to float for display
	var weiFloat float64
	switch v := wei.(type) {
	case *types.BigInt:
		if v == nil || v.Int == nil {
			return "0"
		}
		weiFloat = float64(v.Int.Int64())
	default:
		weiFloat, _ = v.(float64)
	}

	gwei := weiFloat / 1e9
	return fmt.Sprintf("%.2f", gwei)
}
