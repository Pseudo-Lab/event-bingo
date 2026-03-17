# Service User Flow

## Confirmed Flow
1. User logs in.
2. User selects interest keywords.
3. User meets another participant offline and enters their own code in the other user's input field.
4. Sender keywords are applied to the receiver bingo board.
5. Progress updates in real time for personal mode and team mode.

## Core Rules
- Bingo board cells are generated randomly per user at first login in each event.
- Generated board layout stays fixed after first generation.
- User keyword assignment for the board is fixed after initial generation.
- Exchange behavior must support both individual mode and team mode.

## Service Screens
1. Login screen:
- name and password input
- privacy agreement checkbox

2. Keyword selection screen:
- user selects required keyword count
- start button moves user to game screen

3. Game screen:
- profile block and keyword input action
- personal completion metric and counters
- bingo board visualization and completed lines
- two interaction lists:
- given-to list (people I sent to)
- received-from list (people who sent to me)

4. Team mode panel:
- team-vs-team status card
- goal progress bar and remaining lines text
- end state when time ends or goal is reached

## Data And Event Notes
- Keep exchange events traceable with sender, receiver, event_id, timestamp.
- Ensure board update and exchange history are consistent to prevent desync.

## Language And Sync Rule
- English file is source-of-truth for implementation.
- Keep Korean mirror `docs/reference/service-user-flow.ko.md` in sync on every update.

