import efinance as ef
import pandas as pd
import time, sys, json

today = time.strftime("%Y%m%d", time.localtime())
yestoday = time.strftime("%Y%m%d", time.localtime(time.time()-86400))

if len(sys.argv) > 1:
    today = sys.argv[1]
    if len(sys.argv) <= 2:
        yestoday = time.strftime("%Y%m%d", time.localtime(time.mktime(time.strptime(today, "%Y%m%d")) - 86400))
    else:
        yestoday = sys.argv[2]

print(f"Analyse between {yestoday} and {today} ...")

with open(f"./data/hit_r_{today}", 'r') as fp:
    today_hitr = json.load(fp)

with open(f"./data/hit_r_{yestoday}", 'r') as fp:
    yestoday_hitr = json.load(fp)

hit_count = 0; new_count = 0

for sid in today_hitr:
    if sid in yestoday_hitr:
        print(f"HIT_R: {sid}")
        hit_count += 1
    else:
        new_count += 1

print(f"total hit: {hit_count}, new {new_count}, {today} {len(today_hitr)}, {yestoday} {len(yestoday_hitr)}")