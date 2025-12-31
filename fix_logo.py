from PIL import Image

# Carregar
img = Image.open('public/images/logo.png')
print(f"Tamanho original: {img.size}")

# Redimensionar para 45x30px (compatível com o CSS)
img_small = img.resize((45, 30), Image.Resampling.LANCZOS)
img_small.save('public/images/logo.png', 'PNG', optimize=True)

print(f"Novo tamanho: {img_small.size}")
print("✅ Logo redimensionada com sucesso!")
