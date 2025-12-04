import json, collections, pathlib, math, random
try:
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
    import colorsys
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL/Pillow not available. Install with: pip install pillow numpy")

root = pathlib.Path(r"/mnt/c/Users/Langkasuka/desktop/datavisproject")
img_dir = root / "assets" / "images"
img_dir.mkdir(parents=True, exist_ok=True)

# Load data
with open(root / "data" / "police_enforcement_data.json") as f:
    records = json.load(f)

# Color palettes
def get_gradient_colors(start_color, end_color, steps):
    """Generate gradient colors between two RGB colors"""
    colors = []
    for i in range(steps):
        ratio = i / (steps - 1)
        r = int(start_color[0] + (end_color[0] - start_color[0]) * ratio)
        g = int(start_color[1] + (end_color[1] - start_color[1]) * ratio)
        b = int(start_color[2] + (end_color[2] - start_color[2]) * ratio)
        colors.append((r, g, b))
    return colors

# Creative color schemes
vibrant_palette = [
    (255, 99, 132),   # Pink
    (54, 162, 235),   # Blue
    (255, 206, 86),   # Yellow
    (75, 192, 192),   # Teal
    (153, 102, 255),  # Purple
    (255, 159, 64),   # Orange
    (199, 199, 199),  # Gray
    (83, 102, 255),   # Indigo
]

heatmap_palette = get_gradient_colors((240, 240, 255), (75, 0, 130), 10)

# Font setup
try:
    font_title = ImageFont.truetype("arial.ttf", 20)
    font_large = ImageFont.truetype("arial.ttf", 16)
    font_medium = ImageFont.truetype("arial.ttf", 14)
    font_small = ImageFont.truetype("arial.ttf", 12)
except:
    font_title = font_large = font_medium = font_small = ImageFont.load_default()

def create_circular_trend_chart():
    """Create a circular/radial trend chart"""
    # Aggregate data by year
    by_year = collections.defaultdict(int)
    for r in records:
        by_year[r['year']] += r['count']
    
    years = sorted(by_year.keys())
    values = [by_year[year] for year in years]
    
    w, h = 800, 800
    img = Image.new('RGB', (w, h), (250, 250, 250))
    draw = ImageDraw.Draw(img)
    
    center_x, center_y = w // 2, h // 2
    max_radius = min(w, h) // 2 - 80
    min_radius = 60
    
    max_val = max(values)
    
    # Draw circular grid
    for i in range(5):
        radius = min_radius + (max_radius - min_radius) * (i + 1) / 5
        draw.ellipse([center_x - radius, center_y - radius, 
                     center_x + radius, center_y + radius], 
                    outline=(200, 200, 200), width=1)
    
    # Draw radial lines and data
    angle_step = 2 * math.pi / len(years)
    
    for i, (year, value) in enumerate(zip(years, values)):
        angle = i * angle_step - math.pi / 2  # Start from top
        
        # Radial grid line
        x_end = center_x + max_radius * math.cos(angle)
        y_end = center_y + max_radius * math.sin(angle)
        draw.line([center_x, center_y, x_end, y_end], fill=(200, 200, 200), width=1)
        
        # Data point
        normalized_value = value / max_val
        radius = min_radius + normalized_value * (max_radius - min_radius)
        x = center_x + radius * math.cos(angle)
        y = center_y + radius * math.sin(angle)
        
        # Draw filled segment
        next_angle = (i + 1) * angle_step - math.pi / 2
        next_radius = min_radius + (values[(i + 1) % len(values)] / max_val) * (max_radius - min_radius)
        next_x = center_x + next_radius * math.cos(next_angle)
        next_y = center_y + next_radius * math.sin(next_angle)
        
        color = vibrant_palette[i % len(vibrant_palette)]
        draw.polygon([center_x, center_y, x, y, next_x, next_y], 
                    fill=color + (128,))  # Semi-transparent
        
        # Draw data point
        draw.ellipse([x - 4, y - 4, x + 4, y + 4], fill=color)
        
        # Year label
        label_x = center_x + (max_radius + 20) * math.cos(angle)
        label_y = center_y + (max_radius + 20) * math.sin(angle)
        draw.text((label_x, label_y), str(year), fill=(50, 50, 50), 
                 font=font_small, anchor="mm")
    
    # Title
    draw.text((w // 2, 30), "Radial Trend: Drug Enforcement Over Time", 
             fill=(20, 20, 20), font=font_title, anchor="mm")
    
    img.save(img_dir / 'radial_trend.png', dpi=(150, 150))

def create_heatmap():
    """Create a heatmap of drug types by jurisdiction and year"""
    # Prepare data
    jurisdictions = sorted(set(r['jurisdiction'] for r in records))
    years = sorted(set(r['year'] for r in records))
    drugs = ['cannabis', 'cocaine', 'ecstasy', 'methamphetamine', 'amphetamine']
    
    # Create matrix
    matrix = {}
    for jurisdiction in jurisdictions:
        for year in years:
            for drug in drugs:
                matrix[(jurisdiction, year, drug)] = 0
    
    # Fill matrix
    for r in records:
        for drug in drugs:
            if r['drugs'].get(drug, 0) > 0:
                matrix[(r['jurisdiction'], r['year'], drug)] += r['count']
    
    # Create heatmap for each drug
    for drug_idx, drug in enumerate(drugs):
        w, h = 1200, 600
        img = Image.new('RGB', (w, h), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        # Calculate max value for normalization
        max_val = max(matrix[(j, y, drug)] for j in jurisdictions for y in years)
        if max_val == 0:
            max_val = 1
        
        # Draw heatmap
        cell_width = (w - 150) // len(years)
        cell_height = (h - 100) // len(jurisdictions)
        
        for j_idx, jurisdiction in enumerate(jurisdictions):
            for y_idx, year in enumerate(years):
                value = matrix[(jurisdiction, year, drug)]
                intensity = value / max_val if max_val > 0 else 0
                
                # Color based on intensity
                color_idx = min(int(intensity * len(heatmap_palette)), len(heatmap_palette) - 1)
                color = heatmap_palette[color_idx]
                
                x = 100 + y_idx * cell_width
                y = 50 + j_idx * cell_height
                
                draw.rectangle([x, y, x + cell_width - 2, y + cell_height - 2], 
                             fill=color, outline=(255, 255, 255))
                
                # Add value text for significant values
                if value > max_val * 0.1:
                    draw.text((x + cell_width // 2, y + cell_height // 2), 
                             str(value), fill=(255, 255, 255), 
                             font=font_small, anchor="mm")
        
        # Labels
        draw.text((w // 2, 10), f"Heatmap: {drug.title()} Distribution by Jurisdiction & Year", 
                 fill=(20, 20, 20), font=font_title, anchor="mm")
        
        # Year labels
        for y_idx, year in enumerate(years[::2]):  # Show every other year
            x = 100 + y_idx * 2 * cell_width + cell_width
            draw.text((x, h - 30), str(year), fill=(50, 50, 50), 
                     font=font_small, anchor="mm")
        
        # Jurisdiction labels
        for j_idx, jurisdiction in enumerate(jurisdictions):
            y = 50 + j_idx * cell_height + cell_height // 2
            draw.text((80, y), jurisdiction, fill=(50, 50, 50), 
                     font=font_small, anchor="mm")
        
        img.save(img_dir / f'heatmap_{drug}.png', dpi=(150, 150))

def create_bubble_chart():
    """Create a bubble chart showing relationships between metrics"""
    # Aggregate data by jurisdiction for latest year
    latest_year = max(r['year'] for r in records)
    latest_data = [r for r in records if r['year'] == latest_year]
    
    # Group by jurisdiction
    by_jurisdiction = collections.defaultdict(lambda: {'count': 0, 'fines': 0, 'arrests': 0, 'charges': 0})
    for r in latest_data:
        j = r['jurisdiction']
        by_jurisdiction[j]['count'] += r['count']
        by_jurisdiction[j]['fines'] += r['fines']
        by_jurisdiction[j]['arrests'] += r['arrests']
        by_jurisdiction[j]['charges'] += r['charges']
    
    w, h = 1000, 700
    img = Image.new('RGB', (w, h), (245, 245, 245))
    draw = ImageDraw.Draw(img)
    
    # Calculate ranges
    counts = [data['count'] for data in by_jurisdiction.values()]
    fines = [data['fines'] for data in by_jurisdiction.values()]
    
    max_count = max(counts)
    max_fines = max(fines)
    
    # Draw axes
    margin = 80
    draw.line([margin, h - margin, w - margin, h - margin], fill=(100, 100, 100), width=2)
    draw.line([margin, margin, margin, h - margin], fill=(100, 100, 100), width=2)
    
    # Plot bubbles
    for i, (jurisdiction, data) in enumerate(by_jurisdiction.items()):
        x = margin + (data['fines'] / max_fines) * (w - 2 * margin)
        y = h - margin - (data['count'] / max_count) * (h - 2 * margin)
        
        # Bubble size based on arrests
        bubble_size = 10 + (data['arrests'] / max(data['arrests'] for data in by_jurisdiction.values())) * 40
        
        color = vibrant_palette[i % len(vibrant_palette)]
        draw.ellipse([x - bubble_size, y - bubble_size, x + bubble_size, y + bubble_size], 
                    fill=color + (180,), outline=color, width=2)
        
        # Label
        draw.text((x, y), jurisdiction, fill=(255, 255, 255), 
                 font=font_small, anchor="mm")
    
    # Labels and title
    draw.text((w // 2, 20), f"Bubble Chart: Enforcement Metrics by Jurisdiction ({latest_year})", 
             fill=(20, 20, 20), font=font_title, anchor="mm")
    draw.text((w // 2, h - 40), "Number of Fines", fill=(50, 50, 50), 
             font=font_medium, anchor="mm")
    draw.text((30, h // 2), "Total Count", fill=(50, 50, 50), 
             font=font_medium, anchor="mm", angle=90)
    
    # Legend
    legend_text = "Bubble size = Number of arrests"
    draw.text((w - 200, 60), legend_text, fill=(70, 70, 70), font=font_small)
    
    img.save(img_dir / 'bubble_chart.png', dpi=(150, 150))

def create_radar_chart():
    """Create radar/spider chart comparing jurisdictions"""
    # Select latest year data
    latest_year = max(r['year'] for r in records)
    latest_data = [r for r in records if r['year'] == latest_year]
    
    # Metrics to compare
    metrics = ['count', 'fines', 'arrests', 'charges']
    jurisdictions = list(set(r['jurisdiction'] for r in latest_data))[:6]  # Limit to 6 for clarity
    
    # Normalize data for each jurisdiction
    max_values = {metric: max(r[metric] for r in latest_data) for metric in metrics}
    
    w, h = 800, 800
    img = Image.new('RGB', (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    center_x, center_y = w // 2, h // 2
    radius = min(w, h) // 3
    
    # Draw radar grid
    num_metrics = len(metrics)
    angle_step = 2 * math.pi / num_metrics
    
    # Draw concentric polygons
    for i in range(1, 6):
        r = radius * i / 5
        points = []
        for j in range(num_metrics):
            angle = j * angle_step - math.pi / 2
            x = center_x + r * math.cos(angle)
            y = center_y + r * math.sin(angle)
            points.append((x, y))
        draw.polygon(points, outline=(200, 200, 200), width=1)
    
    # Draw axes
    for j in range(num_metrics):
        angle = j * angle_step - math.pi / 2
        x = center_x + radius * math.cos(angle)
        y = center_y + radius * math.sin(angle)
        draw.line([center_x, center_y, x, y], fill=(200, 200, 200), width=1)
        
        # Metric labels
        label_x = center_x + (radius + 30) * math.cos(angle)
        label_y = center_y + (radius + 30) * math.sin(angle)
        draw.text((label_x, label_y), metrics[j].title(), fill=(50, 50, 50), 
                 font=font_medium, anchor="mm")
    
    # Plot data for each jurisdiction
    for j_idx, jurisdiction in enumerate(jurisdictions):
        # Get jurisdiction data
        jur_data = [r for r in latest_data if r['jurisdiction'] == jurisdiction]
        if not jur_data:
            continue
            
        # Aggregate metrics
        agg_data = {metric: sum(r[metric] for r in jur_data) for metric in metrics}
        
        # Create polygon points
        points = []
        for i, metric in enumerate(metrics):
            angle = i * angle_step - math.pi / 2
            normalized_value = agg_data[metric] / max_values[metric] if max_values[metric] > 0 else 0
            r = radius * normalized_value
            x = center_x + r * math.cos(angle)
            y = center_y + r * math.sin(angle)
            points.append((x, y))
        
        color = vibrant_palette[j_idx % len(vibrant_palette)]
        draw.polygon(points, fill=color + (100,), outline=color, width=2)
    
    # Title and legend
    draw.text((w // 2, 30), f"Radar Chart: Jurisdiction Comparison ({latest_year})", 
             fill=(20, 20, 20), font=font_title, anchor="mm")
    
    # Legend
    legend_y = 100
    for j_idx, jurisdiction in enumerate(jurisdictions):
        color = vibrant_palette[j_idx % len(vibrant_palette)]
        draw.rectangle([w - 150, legend_y + j_idx * 25, w - 130, legend_y + j_idx * 25 + 15], 
                       fill=color)
        draw.text((w - 120, legend_y + j_idx * 25 + 7), jurisdiction, 
                 fill=(50, 50, 50), font=font_small)
    
    img.save(img_dir / 'radar_chart.png', dpi=(150, 150))

def create_stream_graph():
    """Create a stream graph showing drug type trends over time"""
    # Prepare data
    years = sorted(set(r['year'] for r in records))
    drugs = ['cannabis', 'cocaine', 'ecstasy', 'methamphetamine', 'amphetamine']
    
    # Aggregate data by year and drug
    data = {drug: [] for drug in drugs}
    for year in years:
        year_data = {drug: 0 for drug in drugs}
        for r in records:
            if r['year'] == year:
                for drug in drugs:
                    if r['drugs'].get(drug, 0) > 0:
                        year_data[drug] += r['count']
        
        for drug in drugs:
            data[drug].append(year_data[drug])
    
    w, h = 1200, 600
    img = Image.new('RGB', (w, h), (250, 250, 250))
    draw = ImageDraw.Draw(img)
    
    margin = 80
    graph_width = w - 2 * margin
    graph_height = h - 2 * margin
    
    # Calculate stacked values
    stacked_data = []
    for i in range(len(years)):
        total = sum(data[drug][i] for drug in drugs)
        stacked_data.append(total)
    
    max_total = max(stacked_data) if stacked_data else 1
    
    # Draw stream
    x_step = graph_width / (len(years) - 1) if len(years) > 1 else 0
    
    # Calculate cumulative values for stacking
    cumulative = [0] * len(years)
    
    for drug_idx, drug in enumerate(drugs):
        points_top = []
        points_bottom = []
        
        for i, year in enumerate(years):
            x = margin + i * x_step
            value = data[drug][i]
            
            # Normalize and create smooth curve effect
            normalized_height = (value / max_total) * graph_height if max_total > 0 else 0
            
            y_top = h - margin - cumulative[i] - normalized_height
            y_bottom = h - margin - cumulative[i]
            
            points_top.append((x, y_top))
            points_bottom.append((x, y_bottom))
        
        # Draw filled area
        all_points = points_top + points_bottom[::-1]
        color = vibrant_palette[drug_idx % len(vibrant_palette)]
        
        if len(all_points) > 2:
            draw.polygon(all_points, fill=color + (180,))
        
        # Update cumulative values
        for i in range(len(years)):
            cumulative[i] += (data[drug][i] / max_total) * graph_height if max_total > 0 else 0
    
    # Draw axes
    draw.line([margin, h - margin, w - margin, h - margin], fill=(100, 100, 100), width=2)
    draw.line([margin, margin, margin, h - margin], fill=(100, 100, 100), width=2)
    
    # Title and labels
    draw.text((w // 2, 20), "Stream Graph: Drug Type Trends Over Time", 
             fill=(20, 20, 20), font=font_title, anchor="mm")
    draw.text((w // 2, h - 40), "Year", fill=(50, 50, 50), 
             font=font_medium, anchor="mm")
    
    # Year labels
    for i, year in enumerate(years[::2]):  # Show every other year
        x = margin + i * 2 * x_step
        draw.text((x, h - margin + 20), str(year), fill=(50, 50, 50), 
                 font=font_small, anchor="mm")
    
    # Legend
    legend_y = 100
    for drug_idx, drug in enumerate(drugs):
        color = vibrant_palette[drug_idx % len(vibrant_palette)]
        draw.rectangle([w - 150, legend_y + drug_idx * 25, w - 130, legend_y + drug_idx * 25 + 15], 
                       fill=color)
        draw.text((w - 120, legend_y + drug_idx * 25 + 7), drug.title(), 
                 fill=(50, 50, 50), font=font_small)
    
    img.save(img_dir / 'stream_graph.png', dpi=(150, 150))

# Generate all creative visualizations
print("Creating creative visualizations...")
create_circular_trend_chart()
create_heatmap()
create_bubble_chart()
create_radar_chart()
create_stream_graph()
print("Creative visualizations saved to", img_dir)