//! Terminal UI for interactive transaction review

use crate::{types::TxParams, Result};
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::{Backend, CrosstermBackend},
    layout::{Alignment, Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, Paragraph, Wrap},
    Frame, Terminal,
};
use std::io;

/// Review a transaction and get user approval
pub fn review_transaction(tx_params: &TxParams) -> Result<bool> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Run the app
    let result = run_app(&mut terminal, tx_params);

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    result
}

fn run_app<B: Backend>(terminal: &mut Terminal<B>, tx_params: &TxParams) -> Result<bool> {
    let mut scroll: u16 = 0;

    loop {
        terminal.draw(|f| ui(f, tx_params, scroll))?;

        if let Event::Key(key) = event::read()? {
            match key.code {
                KeyCode::Char('y') | KeyCode::Char('Y') | KeyCode::Enter => {
                    return Ok(true);
                }
                KeyCode::Char('n') | KeyCode::Char('N') | KeyCode::Esc | KeyCode::Char('q') => {
                    return Ok(false);
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    scroll = scroll.saturating_add(1);
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    scroll = scroll.saturating_sub(1);
                }
                KeyCode::PageDown => {
                    scroll = scroll.saturating_add(10);
                }
                KeyCode::PageUp => {
                    scroll = scroll.saturating_sub(10);
                }
                _ => {}
            }
        }
    }
}

fn ui(f: &mut Frame, tx_params: &TxParams, scroll: u16) {
    let size = f.area();

    // Create main layout
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(10),
            Constraint::Length(4),
        ])
        .split(size);

    // Title
    let title = Paragraph::new("Transaction Review")
        .style(
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        )
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(title, chunks[0]);

    // Transaction details
    let details = create_transaction_details(tx_params);
    let details_paragraph = Paragraph::new(details)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Details")
                .style(Style::default().fg(Color::White)),
        )
        .wrap(Wrap { trim: true })
        .scroll((scroll, 0));
    f.render_widget(details_paragraph, chunks[1]);

    // Help/Controls
    let help = create_help_text();
    let help_paragraph = Paragraph::new(help)
        .block(Block::default().borders(Borders::ALL).title("Controls"))
        .alignment(Alignment::Center);
    f.render_widget(help_paragraph, chunks[2]);
}

fn create_transaction_details(tx_params: &TxParams) -> Text<'static> {
    let mut lines = Vec::new();

    // Network info
    lines.push(Line::from(vec![
        Span::styled("Network: ", Style::default().add_modifier(Modifier::BOLD)),
        Span::styled(
            format!(
                "{} (Chain ID: {})",
                tx_params.metadata.network.name, tx_params.metadata.network.chain_id
            ),
            Style::default().fg(Color::Green),
        ),
    ]));

    lines.push(Line::from(""));

    // Transaction type
    lines.push(Line::from(vec![
        Span::styled("Mode: ", Style::default().add_modifier(Modifier::BOLD)),
        Span::styled(
            format!("{:?}", tx_params.mode),
            Style::default().fg(Color::Yellow),
        ),
    ]));

    if let Some(fn_name) = &tx_params.function_name {
        lines.push(Line::from(vec![
            Span::styled("Function: ", Style::default().add_modifier(Modifier::BOLD)),
            Span::styled(fn_name.clone(), Style::default().fg(Color::Cyan)),
        ]));
    }

    lines.push(Line::from(""));

    // From/To
    lines.push(Line::from(vec![
        Span::styled("From: ", Style::default().add_modifier(Modifier::BOLD)),
        Span::raw(format!("{}", tx_params.transaction.from)),
    ]));

    if let Some(to) = tx_params.transaction.to {
        lines.push(Line::from(vec![
            Span::styled("To: ", Style::default().add_modifier(Modifier::BOLD)),
            Span::raw(format!("{}", to)),
        ]));
    } else {
        lines.push(Line::from(vec![
            Span::styled("To: ", Style::default().add_modifier(Modifier::BOLD)),
            Span::styled("Contract Creation", Style::default().fg(Color::Magenta)),
        ]));
    }

    lines.push(Line::from(""));

    // Value
    if let Some(value) = tx_params.transaction.value {
        if value > alloy::primitives::U256::ZERO {
            lines.push(Line::from(vec![
                Span::styled("Value: ", Style::default().add_modifier(Modifier::BOLD)),
                Span::styled(
                    format!("{} wei", value),
                    Style::default().fg(Color::Yellow),
                ),
            ]));
        }
    }

    // Gas details
    lines.push(Line::from(vec![
        Span::styled("Nonce: ", Style::default().add_modifier(Modifier::BOLD)),
        Span::raw(format!("{}", tx_params.transaction.nonce)),
    ]));

    lines.push(Line::from(vec![
        Span::styled("Gas Limit: ", Style::default().add_modifier(Modifier::BOLD)),
        Span::raw(format!("{}", tx_params.transaction.gas_limit)),
    ]));

    if let Some(max_fee) = tx_params.transaction.max_fee_per_gas {
        lines.push(Line::from(vec![
            Span::styled(
                "Max Fee Per Gas: ",
                Style::default().add_modifier(Modifier::BOLD),
            ),
            Span::raw(format!("{} gwei", max_fee / alloy::primitives::U256::from(1_000_000_000u64))),
        ]));
    }

    if let Some(priority_fee) = tx_params.transaction.max_priority_fee_per_gas {
        lines.push(Line::from(vec![
            Span::styled(
                "Priority Fee: ",
                Style::default().add_modifier(Modifier::BOLD),
            ),
            Span::raw(format!("{} gwei", priority_fee / alloy::primitives::U256::from(1_000_000_000u64))),
        ]));
    }

    if let Some(gas_price) = tx_params.transaction.gas_price {
        lines.push(Line::from(vec![
            Span::styled("Gas Price: ", Style::default().add_modifier(Modifier::BOLD)),
            Span::raw(format!("{} gwei", gas_price / alloy::primitives::U256::from(1_000_000_000u64))),
        ]));
    }

    lines.push(Line::from(""));

    // Estimated cost (highlighted)
    lines.push(Line::from(vec![
        Span::styled(
            "Estimated Cost: ",
            Style::default()
                .add_modifier(Modifier::BOLD)
                .fg(Color::Red),
        ),
        Span::styled(
            format!("{} ETH", tx_params.metadata.estimated_cost),
            Style::default()
                .add_modifier(Modifier::BOLD)
                .fg(Color::Red),
        ),
    ]));

    lines.push(Line::from(""));

    // Parameters (if any)
    if let Some(params) = &tx_params.params {
        lines.push(Line::from(Span::styled(
            "Parameters:",
            Style::default().add_modifier(Modifier::BOLD),
        )));
        let params_str = serde_json::to_string_pretty(params).unwrap_or_default();
        for param_line in params_str.lines() {
            lines.push(Line::from(Span::raw(format!("  {}", param_line))));
        }
    }

    Text::from(lines)
}

fn create_help_text() -> Text<'static> {
    Text::from(vec![
        Line::from(vec![
            Span::styled("[Y/Enter]", Style::default().fg(Color::Green)),
            Span::raw(" Approve & Sign  "),
            Span::styled("[N/Q/Esc]", Style::default().fg(Color::Red)),
            Span::raw(" Cancel"),
        ]),
        Line::from(vec![
            Span::styled("[↑/↓ or j/k]", Style::default().fg(Color::Cyan)),
            Span::raw(" Scroll  "),
            Span::styled("[PgUp/PgDn]", Style::default().fg(Color::Cyan)),
            Span::raw(" Fast Scroll"),
        ]),
    ])
}
