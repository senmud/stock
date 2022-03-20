import enum
import pandas as pd
from functools import reduce

class SliceWin:
    def __init__(self, data:pd.DataFrame, selector:str, win:int) -> None:
        self.__df = data
        self.__selector = selector
        self.__slice_data = tuple(map(lambda x: getattr(x, self.__selector), self.__df.itertuples()))
        self.DEFAULT_WIN = len(self.__slice_data) / 2 - 1
        self.__win = win if win <= self.DEFAULT_WIN else self.DEFAULT_WIN
        self.__avg:list = []

    def slice_avg_ex(self) -> int:
        sum:float = 0.0
        slice_tmp:tuple = self.__slice_data[-2*self.__win+1:]
        first:float = slice_tmp[0]

        for i, v in enumerate(slice_tmp):
            sum += v
            #print(f"ex: {i} {v}, first {first}, sum {sum}, avg {round(sum/self.__win, 2)}")
            if (i+1) >= self.__win:
                self.__avg.append((v, round(sum/self.__win, 2)))
                sum -= first
                first = slice_tmp[i-self.__win+2]

        return reduce(SliceWin.__judge, self.__avg)

    def slice_avg(self) -> int:
        '''
        Return:
            每日最高价高于窗口平均价, 返回1
            每日最高价低于窗口平均价, 返回-1
            其他, 返回0
        '''
        avg:float = self.__slice_data[-self.__win-1]
        self.__avg = tuple(map(lambda x:(x, (x+avg)/2), self.__slice_data[-self.__win:]))

        return reduce(SliceWin.__judge, self.__avg)

    def slice_cmp(self, limit:float) -> int:
        '''
        Return:
            每日最高价高于limit, 返回1
            每日最高价低于limit, 返回-1
            其他, 返回0
        '''
        def __judge(x,y) -> int:
            if isinstance(x, float):
                return 1 if x > limit else -1
            else:
                rst = 1 if y > limit else -1
                if x > 0 and rst > 0:
                    return 1
                elif x < 0 and rst < 0:
                    return -1
                else:
                    return 0

        self.__avg = self.__slice_data[-self.__win:]

        return reduce(__judge, self.__avg)

    def slice_data(self) -> tuple:
        return self.__avg

    @staticmethod
    def __judge(x, y:tuple) -> int:
        if isinstance(x, tuple):
            return 1 if x[0] > x[1] else -1
        else:
            rst = 1 if y[0] > y[1] else -1
            if x > 0 and rst > 0:
                return 1
            elif x < 0 and rst < 0:
                return -1
            else:
                return 0
        


    

