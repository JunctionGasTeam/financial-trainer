# Financial Trainer

**An AI financial coach that answers questions about your own banking data with numbers you can trust.**

Built for the S-Bank challenge at Junction 2026: *"How could AI turn personal banking data into practical guidance for everyday life?"*

## The problem

Young adults need financial literacy the most, yet banking apps mostly show them static charts. Charts don't answer the real questions: *Can I afford this? Where did my money go? How could I save more?* AI chatbots answer in plain language, but they make up numbers, and in finance a wrong number is worse than no answer.

## Our solution

Financial Trainer lets people **talk with their own money**. It turns raw transactions into one clear number, a simple picture of spending, and a coach that answers in plain English.

### How we keep the numbers honest

The AI never calculates anything:

1. The model turns the question into a **structured query** (measure, period, grouping).
2. The app **runs the query on the phone** against the user's transactions in a local SQLite database.
3. The model gets the exact results and **only words the reply**.

Every lookup is shown under the answer. Raw transactions stay on the device, and the model sees only aggregated figures.

## Features

**Safe to spend this week.** The home screen leads with one number: what the user can spend until payday. It is the balance minus upcoming housing, utilities, groceries and a safety buffer, rounded down to €5. Tapping it shows every line of the calculation and its source.

**Three baskets.** Spending is sorted into the brief's three baskets:

| Basket | Examples |
|---|---|
| Regular essentials | Rent, utilities, groceries, insurance |
| Unexpected necessities | Repairs, medical costs, large unplanned purchases |
| Everyday spending | Restaurants, entertainment, shopping, taxis |

Transparent rules decide the basket, not a model. Users can move a category, merchant type or single transaction to another basket, and every figure updates instantly.

**Ask your money.** Users can ask the chat about their finances, for example *"How much did I spend on taxis last month?"*, *"Did I spend more on groceries than last month?"* or *"What is a buffer?"* Financial terms are explained using the user's own figures. Suggested follow-ups help users dig deeper, compare and act.

**Spending report.** An interactive pie chart that drills down from baskets to categories.

**Anomaly detection.** Three AI analysts look at spending trends, category shifts and cash flow, and flag unusual months in short bullets. These are presented as something worth a look, never as fraud.

**Savings goal.** Users set a target and get three scenarios (gentle, balanced, focused), each with a monthly amount, the categories to trim, and the time to reach the goal. A spending profile explains the user's habits.

**Mortgage estimate.** Compares the user with historical mortgage outcomes from the dataset and shows similar cases and key factors. It is presented as an estimate, not a decision.

**Investment options.** A plain-language introduction to investing for users with money to spare.

## Demo personas

The app works for all 5,100 customers in the dataset. The demo uses three fictional ones:

| Persona | Situation | Shows |
|---|---|---|
| **Aino**, 22 | Often below zero, restaurants at twice the level of peers | Safe to spend, baskets, chat |
| **Mikko**, 36 | Saves about €400 a month, approved mortgage | Savings, mortgage, investing |
| **Sara**, 23 | Restaurant spike, large one-off purchase | Anomalies, unexpected necessities |

## Technology

- **App:** React Native, Expo SDK 58, Expo Router
- **Data:** expo-sqlite with S-Bank's transaction, customer and mortgage CSVs on the device
- **Calculations:** plain TypeScript functions, fully reproducible
- **AI:** Google Gemini through a small Node.js server, used only to interpret questions, word replies and spot patterns
- **UI:** react-native-svg, Reanimated, Expo UI

## Why it matters

- **Trust:** the AI explains numbers but never produces them.
- **Literacy:** the baskets and plain explanations teach users how their money behaves.
- **Privacy:** transaction history stays on the device.
- **Fit for S-Bank:** built for young customers, next to S-Bank and S-Etukortti services.

## What's next

- A fully on-device language model
- Multi-bank view through PSD2
- Statistics Finland benchmarks by postal area
- Finnish language support
