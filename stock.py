import efinance as ef

stock_code = '002236'

series = ef.stock.get_base_info(stock_code)
print(series)

df = ef.stock.get_quote_history(stock_code, beg='20181001', end='20210930')
print(df)
df = ef.stock.get_realtime_quotes()
print(df)