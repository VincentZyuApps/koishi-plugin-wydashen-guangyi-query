import os

filepath = '/home/bawuyinguo/SSoftwareFiles/koishi/koishi-dev-4/external/wydashen-guangyi-query/go/renderer/renderer.go'

with open(filepath, 'r') as f:
    content = f.read()

# Add theme field to Renderer struct
if 'type Renderer struct {' in content and 'theme Theme' not in content:
    content = content.replace('type Renderer struct {', 'type Renderer struct {\n\ttheme Theme')

# Update RenderToPNG to set theme
if 'func (r *Renderer) RenderToPNG(input *types.RenderInput) (string, error) {' in content:
    content = content.replace(
        'func (r *Renderer) RenderToPNG(input *types.RenderInput) (string, error) {',
        'func (r *Renderer) RenderToPNG(input *types.RenderInput) (string, error) {\n\t// 设置主题\n\tr.theme = GetTheme(input.Config.DarkMode)\n'
    )

# Replace global colors with theme fields
replacements = {
    'ColorBgMain': 'r.theme.ColorBgMain',
    'ColorBgCard': 'r.theme.ColorBgCard',
    'ColorBgHeader': 'r.theme.ColorBgHeader',
    'ColorTextPrimary': 'r.theme.ColorTextPrimary',
    'ColorTextSecondary': 'r.theme.ColorTextSecondary',
    'ColorTextMuted': 'r.theme.ColorTextMuted',
    'ColorTitle': 'r.theme.ColorTitle',
    'ColorCollectedBg': 'r.theme.ColorCollectedBg',
    'ColorCollectedFg': 'r.theme.ColorCollectedFg',
    'ColorDepositedBg': 'r.theme.ColorDepositedBg',
    'ColorDepositedFg': 'r.theme.ColorDepositedFg',
    'ColorNotRedeemedBg': 'r.theme.ColorNotRedeemedBg',
    'ColorNotRedeemedFg': 'r.theme.ColorNotRedeemedFg',
    'ColorUncollectedBg': 'r.theme.ColorUncollectedBg',
    'ColorUncollectedFg': 'r.theme.ColorUncollectedFg',
    'ColorBorder': 'r.theme.ColorBorder',
    'ColorBorderLight': 'r.theme.ColorBorderLight',
    'ColorAccent': 'r.theme.ColorAccent',
    'CategoryColors': 'r.theme.CategoryColors',
}

for old, new in replacements.items():
    # Use word boundary checks if possible, but here mostly unique names
    # Be careful not to replace definition if it was in the same file (it is not, defined in styles.go)
    content = content.replace(old, new)
    
# Fix the ColorBgMain replacement in r.theme.ColorBgMain (to avoid double replacement if run multiple times? No, names are distinct enough)
# But wait, r.theme.ColorBgMain contains ColorBgMain.
# If I run 'ColorBgMain' -> 'r.theme.ColorBgMain', 
# then 'r.theme.ColorBgMain' becomes 'r.theme.r.theme.ColorBgMain'.
# I should ensure I don't double replace.
# Simple way: check if already prefixed.
# But 'r.theme.' is not there initially.

# Since I overwrite the file once, I just need to be careful with ordering?
# None of the keys are substrings of others in a way that matters, except maybe ColorBorder vs ColorBorderLight
# If I replace ColorBorder first, ColorBorderLight becomes r.theme.ColorBorderLight. 
# If I replace ColorBorderLight first, it becomes r.theme.ColorBorderLight.
# If I replace ColorBorder -> XXX, then ColorBorderLight -> XXXLight.
# So ColorBorder matches prefix of ColorBorderLight.
# I should sort keys by length descending.

sorted_keys = sorted(replacements.keys(), key=len, reverse=True)
for old in sorted_keys:
    new = replacements[old]
    content = content.replace(old, new)

with open(filepath, 'w') as f:
    f.write(content)

print("Updated renderer.go")
