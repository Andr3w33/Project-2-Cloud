import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# I'm just creating a small dataset manually since the project
# didn't come with a CSV file. My teammate can replace this later
# with real data from the backend or a real database.

data = {
    "diet_type": ["Vegan", "Keto", "Mediterranean", "Vegan", "Keto", "Mediterranean"],
    "protein": [20, 30, 25, 18, 28, 27],
    "carbs": [50, 10, 40, 55, 12, 38],
    "fat": [10, 40, 20, 8, 45, 22]
}

df = pd.DataFrame(data)

# Bar chart: average protein, carbs, fat by diet type
avg_macros = df.groupby("diet_type")[["protein", "carbs", "fat"]].mean()

plt.figure(figsize=(8, 5))
avg_macros.plot(kind="bar")
plt.title("Average Macronutrients by Diet Type")
plt.xlabel("Diet Type")
plt.ylabel("Grams")
plt.tight_layout()
plt.savefig("charts/bar_chart.png")
plt.close()

# Scatter plot: protein vs carbs
plt.figure(figsize=(6, 5))
sns.scatterplot(data=df, x="protein", y="carbs", hue="diet_type")
plt.title("Protein vs Carbs")
plt.tight_layout()
plt.savefig("charts/scatter_plot.png")
plt.close()

# Heatmap: correlation between nutrients
plt.figure(figsize=(6, 5))
corr = df[["protein", "carbs", "fat"]].corr()
sns.heatmap(corr, annot=True, cmap="coolwarm")
plt.title("Nutrient Correlation Heatmap")
plt.tight_layout()
plt.savefig("charts/heatmap.png")
plt.close()

# Pie chart: distribution of diet types
diet_counts = df["diet_type"].value_counts()

plt.figure(figsize=(6, 6))
plt.pie(diet_counts, labels=diet_counts.index, autopct="%1.1f%%")
plt.title("Diet Type Distribution")
plt.tight_layout()
plt.savefig("charts/pie_chart.png")
plt.close()

print("Charts generated and saved in the 'charts' folder.")
