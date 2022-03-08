import pandas as pd

class StockStrategyBase:
    def __init__(self, name:str='') -> None:
        self.name = name

    def execute(self, id:str, df:pd.DataFrame) -> bool:
        pass


class StrategyExchange(StockStrategyBase):
    def __init__(self) -> None:
        super().__init__('Exchg')

    def execute(self, id: str, df: pd.DataFrame) -> bool:
        #return True if id == '601615' else False
        #for row in reversed(df.itertuples()):
            #print(getattr(row, "日期"), getattr(row, "换手率"))
        rst = tuple(map(lambda r: (getattr(r, "日期"), getattr(r, "换手率")), df.itertuples()))
        for id, info in enumerate(reversed(rst)):
            if id < 10:
                if info[1] > 3:
                    return True
            else:
                return False
        