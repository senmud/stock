import pandas as pd
from strategy_libs.slice_win import SliceWin

class StockStrategyBase:
    def __init__(self, name:str='') -> None:
        self.name = name

    def execute(self, id:str, info:dict, df:pd.DataFrame) -> int:
        pass


class StrategyExchange(StockStrategyBase):
    '''
    短期策略，日线交易情况
    '''
    MARKET_VAL:float = 5000000000.0
    EXCHG_RATE:float = 3.0
    def __init__(self) -> None:
        super().__init__('Exchg')

    def execute(self, id: str, info:dict, df: pd.DataFrame) -> int:
        #return True if id == '601615' else False
        #for row in reversed(df.itertuples()):
            #print(getattr(row, "日期"), getattr(row, "换手率"))
        try:
            if float(info.get("流通市值")) < self.MARKET_VAL:
                return False
        except ValueError:
            #print(f'WARN stock {info.get("股票名称")} value invalid {info.get("流通市值")}')
            return False

        exgwin = SliceWin(df, "换手率", 3)
        prcwin = SliceWin(df, "最高", 3)

        #rst = tuple(map(lambda r: (getattr(r, "日期"), getattr(r, "换手率")), df.itertuples()))
        #for id, info in enumerate(reversed(rst)):
        #    if id < 10:
        #        if info[1] >= self.EXCHG_RATE:
        #            return True
        #    else:
        #        return False

        rst_exg = exgwin.slice_cmp(self.EXCHG_RATE)
        rst_prc = prcwin.slice_avg_ex()

        if rst_exg > 0 and rst_prc > 0:
            print(f"\t{id} rst {rst_prc} {prcwin.slice_data()}")
            return 1
        elif rst_exg < 0 and rst_prc < 0:
            return -1
        else:
            return 0
        
        