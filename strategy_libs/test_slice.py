from slice_win import SliceWin
import efinance as ef

stock_id = '603078'

df = ef.stock.get_quote_history(stock_id)

sw = SliceWin(df, "最高", 3)

rst = sw.slice_avg_ex()
print(df)
print(f'rst: {rst}, {sw.slice_data()}')
