from PIL import Image
import os

# Abrir a imagem
img = Image.open('public/images/logo - copia_nova.png')
print(f'Tamanho original: {img.size[0]} x {img.size[1]} pixels')

# Redimensionar para um tamanho apropriado de logo (100px de altura)
width, height = img.size
ratio = 100 / height
new_width = int(width * ratio)
img_resized = img.resize((new_width, 100), Image.Resampling.LANCZOS)

# Salvar como logo.png
img_resized.save('public/images/logo.png', 'PNG', optimize=True)
print(f'✅ Logo redimensionada com sucesso!')
print(f'Novo tamanho: {new_width} x 100 pixels')
os.system('dir public\\images\\logo.png')
