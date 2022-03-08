import enum
import os, sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock import DumpStock
from strategy import StrategyExchange

if __name__ == '__main__':
    ds = DumpStock(strategy=StrategyExchange)
    ds.update_stocklist()
    ds.dump()

    data = DumpStock.load_dataframe('002714' if len(sys.argv) < 2 else sys.argv[1])
    print(data)
