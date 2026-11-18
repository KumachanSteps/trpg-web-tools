#!/bin/bash
# 1) list post URLs per tag (tag pages only), 2) fetch posts in parallel into the pttag.sh cache, 3) build tagmap.tsv from cache
S="${1:?work dir}"
D=$S/pt
: > $D/tagposts.tsv
list_tag() {
  tag="$1"; D="$2"
  for n in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if [ "$n" = 1 ]; then u="https://peritune.com/blog/tag/$tag/"; else u="https://peritune.com/blog/tag/$tag/page/$n/"; fi
    f="$D/tagpage-$(echo "$u" | md5sum | cut -c1-12).html"
    if [ ! -s "$f" ]; then
      code=$(curl -s --max-time 20 -o "$f" -w '%{http_code}' "$u")
      [ "$code" = 200 ] || { rm -f "$f"; break; }
    fi
    grep -oE 'href="https://peritune.com/blog/20[0-9]{2}/[0-9]{2}/[0-9]{2}/[^"/]+/"' "$f" | sed 's/href="//;s/"$//' | sort -u | sed "s#^#$tag\t#"
  done
}
export -f list_tag
cat $D/tags.txt | xargs -P 6 -I{} bash -c 'list_tag "$@"' _ {} "$D" > $D/tagposts.tsv
cut -f2 $D/tagposts.tsv | sort -u > $D/posts-all.txt
echo posts $(wc -l < $D/posts-all.txt)
fetch() { p="$1"; D="$2"; f="$D/$(echo "$p" | md5sum | cut -c1-12).html"; [ -s "$f" ] || curl -s --max-time 20 -o "$f" "$p"; }
export -f fetch
cat $D/posts-all.txt | xargs -P 8 -I{} bash -c 'fetch "$@"' _ {} "$D"
: > $D/tagmap.tsv
while IFS=$'\t' read -r tag p; do
  f="$D/$(echo "$p" | md5sum | cut -c1-12).html"
  y=$(grep -oE '(youtube\.com/embed/|youtu\.be/|watch\?v=)[A-Za-z0-9_-]{11}' "$f" 2>/dev/null | head -1 | grep -oE '[A-Za-z0-9_-]{11}$')
  printf '%s\t%s\t%s\t%s\n' "$tag" "" "$y" "$p" >> $D/tagmap.tsv
done < $D/tagposts.tsv
echo done $(wc -l < $D/tagmap.tsv)
