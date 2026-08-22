import sys

with open('PROGRESS_v2.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace original category 11 items with checkmarks
replacements = {
    "| 11.1 | Different pricing per tool": "| 11.1 | ? Different pricing per tool",
    "| 11.2 | Razorpay integration": "| 11.2 | ? Razorpay integration",
    "| 11.3 | Payment history for user": "| 11.3 | ? Payment history for user",
    "| 11.4 | Payment records for admin": "| 11.4 | ? Payment records for admin",
    "| 11.5 | Monthly limit enforcement": "| 11.5 | ? Monthly limit enforcement",
    "| 11.6 | Post-purchase notification": "| 11.6 | ? Post-purchase notification",
    "| 11.7 | Real-time dashboard update": "| 11.7 | ? Real-time dashboard update",
}

for k, v in replacements.items():
    content = content.replace(k, v)

# Update header to include COMPLETE
content = content.replace("### CATEGORY 11: BILLING & RAZORPAY", "### CATEGORY 11: BILLING & RAZORPAY (COMPLETE)")

with open('PROGRESS_v2.md', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated PROGRESS_v2.md')
